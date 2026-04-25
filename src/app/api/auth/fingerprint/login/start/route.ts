import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  getWebAuthnRpID,
  isAllowedFingerprintRole,
  saveFingerprintChallenge,
} from '@/lib/fingerprint';

const requestSchema = z.object({
  email: z.string().trim().email().optional(),
  expectedRole: z.enum(['ADMIN', 'SELLER']).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'wrong email & password' }, { status: 400 });
    }

    const { email, expectedRole } = parsed.data;

    if (!email) {
      if (expectedRole) {
        return NextResponse.json(
          { success: false, code: 'EMAIL_REQUIRED', message: `${expectedRole} email required` },
          { status: 400 }
        );
      }

      const options = await generateAuthenticationOptions({
        rpID: getWebAuthnRpID(),
        timeout: 60_000,
        userVerification: 'preferred',
      });

      await saveFingerprintChallenge({
        userId: null,
        type: 'LOGIN',
        challenge: options.challenge,
      });

      return NextResponse.json({ success: true, options, discoverable: true, expectedRole: expectedRole || null });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        status: true,
        webauthnCredentials: {
          select: {
            credentialId: true,
            transports: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || !isAllowedFingerprintRole(user.role)) {
      return NextResponse.json({ success: false, message: 'wrong email & password' }, { status: 401 });
    }

    if (expectedRole && user.role !== expectedRole) {
      return NextResponse.json({ success: false, code: 'ROLE_MISMATCH', message: `${expectedRole} account required` }, { status: 403 });
    }

    if (user.webauthnCredentials.length === 0) {
      return NextResponse.json({ success: false, code: 'NOT_ENROLLED', message: 'Fingerprint is not setup yet' }, { status: 400 });
    }

    const options = await generateAuthenticationOptions({
      rpID: getWebAuthnRpID(),
      timeout: 60_000,
      userVerification: 'preferred',
      allowCredentials: user.webauthnCredentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key',
        transports: credential.transports
          ? credential.transports.split(',').map((entry) => entry.trim())
          : undefined,
      })),
    });

    await saveFingerprintChallenge({
      userId: user.id,
      type: 'LOGIN',
      challenge: options.challenge,
    });

    return NextResponse.json({ success: true, options });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to start fingerprint login' }, { status: 500 });
  }
}
