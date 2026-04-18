import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const requestSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Delete all WebAuthn credentials for this user
    const deleteResult = await prisma.webAuthnCredential.deleteMany({
      where: { userId: user.id },
    });

    // Also clear any pending fingerprint challenges
    await prisma.fingerprintChallenge.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Fingerprint cleared',
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error('Clear fingerprint failed:', error);
    return NextResponse.json({ success: false, message: 'Failed to clear fingerprint' }, { status: 500 });
  }
}
