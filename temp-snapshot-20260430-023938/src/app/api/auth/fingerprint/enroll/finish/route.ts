import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  clearFingerprintChallenges,
  getExpectedWebAuthnOriginFromRequest,
  getValidFingerprintChallenge,
  getWebAuthnRpID,
  isAllowedFingerprintRole,
  toBase64Url,
} from '@/lib/fingerprint';

const requestSchema = z.object({
  email: z.string().trim().email(),
  expectedRole: z.enum(['ADMIN', 'SELLER']).optional(),
  response: z.custom<RegistrationResponseJSON>(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Failed to verify fingerprint setup' }, { status: 400 });
    }

    const { email, expectedRole, response } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE' || !isAllowedFingerprintRole(user.role)) {
      return NextResponse.json({ success: false, message: 'Failed to verify fingerprint setup' }, { status: 401 });
    }

    if (expectedRole && user.role !== expectedRole) {
      return NextResponse.json({ success: false, message: `${expectedRole} account required` }, { status: 403 });
    }

    const challenge = await getValidFingerprintChallenge({
      userId: user.id,
      type: 'ENROLL',
    });

    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Fingerprint setup request expired' }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedWebAuthnOriginFromRequest(request),
      expectedRPID: getWebAuthnRpID(),
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ success: false, message: 'Failed to verify fingerprint setup' }, { status: 400 });
    }

    const registrationInfo = verification.registrationInfo as any;

    const normalizeCredentialId = (value: unknown) => {
      if (!value) return null;
      if (typeof value === 'string') return value;
      try {
        return toBase64Url(value as Uint8Array | ArrayBuffer);
      } catch {
        return null;
      }
    };

    const normalizeCredentialPublicKey = (value: unknown) => {
      if (!value) return null;
      if (typeof value === 'string') return value;
      try {
        return toBase64Url(value as Uint8Array | ArrayBuffer);
      } catch {
        return null;
      }
    };

    const credentialId = normalizeCredentialId(
      registrationInfo.credential?.id || registrationInfo.credentialID,
    );

    const credentialPublicKey = normalizeCredentialPublicKey(
      registrationInfo.credential?.publicKey || registrationInfo.credentialPublicKey,
    );

    const counter =
      registrationInfo.credential?.counter ??
      registrationInfo.counter ??
      0;

    if (!credentialId || !credentialPublicKey) {
      return NextResponse.json({ success: false, message: 'Failed to save fingerprint credential' }, { status: 400 });
    }

    const transports = registrationInfo.credential?.transports?.join(',') || null;

    await prisma.webAuthnCredential.upsert({
      where: { credentialId },
      update: {
        userId: user.id,
        credentialPublicKey,
        counter,
        transports,
      },
      create: {
        userId: user.id,
        credentialId,
        credentialPublicKey,
        counter,
        transports,
      },
    });

    await clearFingerprintChallenges({
      userId: user.id,
      type: 'ENROLL',
    });

    return NextResponse.json({ success: true, message: 'success' });
  } catch (error) {
    console.error('Fingerprint enroll finish failed:', error);
    return NextResponse.json({ success: false, message: 'Failed to verify fingerprint setup' }, { status: 500 });
  }
}
