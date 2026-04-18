import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  clearFingerprintChallenges,
  fromBase64Url,
  getExpectedWebAuthnOriginFromRequest,
  getValidFingerprintChallenge,
  getWebAuthnRpID,
  isAllowedFingerprintRole,
  issueFingerprintLoginToken,
} from '@/lib/fingerprint';

const requestSchema = z.object({
  email: z.string().trim().email().optional(),
  response: z.custom<AuthenticationResponseJSON>(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Fingerprint login failed' }, { status: 400 });
    }

    const { email, response } = parsed.data;

    let user = null;
    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE' || !isAllowedFingerprintRole(user.role)) {
        return NextResponse.json({ success: false, message: 'Fingerprint login failed' }, { status: 401 });
      }
    }

    const challenge = await getValidFingerprintChallenge({
      userId: user?.id ?? null,
      type: 'LOGIN',
    });

    if (!challenge) {
      return NextResponse.json({ success: false, message: 'Fingerprint login request expired' }, { status: 400 });
    }

    const responseIds = Array.from(new Set([response.id, response.rawId].filter((value): value is string => typeof value === 'string' && value.length > 0)));

    const credential = await prisma.webAuthnCredential.findFirst({
      where: {
        credentialId: {
          in: responseIds,
        },
      },
      select: {
        id: true,
        userId: true,
        credentialId: true,
        credentialPublicKey: true,
        counter: true,
        transports: true,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { success: false, code: 'NOT_ENROLLED', message: 'Fingerprint is not setup yet' },
        { status: 400 }
      );
    }

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: credential.userId },
        select: { id: true, role: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE' || !isAllowedFingerprintRole(user.role)) {
        return NextResponse.json({ success: false, message: 'Fingerprint login failed' }, { status: 401 });
      }
    }

    if (credential.userId !== user.id) {
      return NextResponse.json({ success: false, message: 'Fingerprint login failed' }, { status: 400 });
    }

    const credentialForVerification = {
      id: credential.credentialId,
      publicKey: fromBase64Url(credential.credentialPublicKey),
      counter: credential.counter,
      transports: credential.transports
        ? credential.transports.split(',').map((entry) => entry.trim())
        : undefined,
    } as any;

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getExpectedWebAuthnOriginFromRequest(request),
      expectedRPID: getWebAuthnRpID(),
      credential: credentialForVerification,
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json({ success: false, message: 'Fingerprint login failed' }, { status: 400 });
    }

    const newCounter = verification.authenticationInfo?.newCounter ?? credential.counter;

    await prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: newCounter,
        lastUsedAt: new Date(),
      },
    });

    await clearFingerprintChallenges({
      userId: user.id,
      type: 'LOGIN',
    });

    const token = await issueFingerprintLoginToken(user.id);

    return NextResponse.json({
      success: true,
      token,
      message: 'success',
    });
  } catch (error) {
    console.error('Fingerprint login finish failed:', error);
    return NextResponse.json({ success: false, message: 'Fingerprint login failed' }, { status: 500 });
  }
}
