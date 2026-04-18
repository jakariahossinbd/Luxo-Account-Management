import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  getWebAuthnRpID,
  getWebAuthnRpName,
  isAllowedFingerprintRole,
  saveFingerprintChallenge,
} from '@/lib/fingerprint';

const requestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'wrong email & password' }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        status: true,
        webauthnCredentials: {
          select: { credentialId: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ success: false, message: 'wrong email & password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid || user.status !== 'ACTIVE' || !isAllowedFingerprintRole(user.role)) {
      return NextResponse.json({ success: false, message: 'wrong email & password' }, { status: 401 });
    }

    const options = await generateRegistrationOptions({
      rpName: getWebAuthnRpName(),
      rpID: getWebAuthnRpID(),
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.name,
      timeout: 60_000,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      excludeCredentials: user.webauthnCredentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key',
        transports: ['internal'],
      })),
    });

    await saveFingerprintChallenge({
      userId: user.id,
      type: 'ENROLL',
      challenge: options.challenge,
    });

    return NextResponse.json({ success: true, options });
  } catch (error) {
    console.error('Fingerprint enroll start failed:', error);
    return NextResponse.json({ success: false, message: 'Failed to start fingerprint setup' }, { status: 500 });
  }
}
