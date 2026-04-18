import crypto from 'node:crypto';
import { prisma } from './prisma';

export const FINGERPRINT_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const FINGERPRINT_LOGIN_TOKEN_TTL_MS = 90 * 1000;

export function getWebAuthnOrigin() {
  return process.env.WEBAUTHN_ORIGIN || process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export function getExpectedWebAuthnOriginFromRequest(request: Request) {
  const forcedOrigin = process.env.WEBAUTHN_ORIGIN;
  if (forcedOrigin) {
    return forcedOrigin;
  }

  const originHeader = request.headers.get('origin');
  if (originHeader) {
    return originHeader;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return getWebAuthnOrigin();
}

export function getWebAuthnRpID() {
  if (process.env.WEBAUTHN_RP_ID) {
    return process.env.WEBAUTHN_RP_ID;
  }

  try {
    const url = new URL(getWebAuthnOrigin());
    return url.hostname;
  } catch {
    return 'localhost';
  }
}

export function getWebAuthnRpName() {
  return process.env.WEBAUTHN_RP_NAME || 'Luxo Account Management';
}

export function isAllowedFingerprintRole(role: string) {
  return role === 'ADMIN' || role === 'SELLER';
}

export function toBase64Url(value: Uint8Array | ArrayBuffer) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return Buffer.from(bytes).toString('base64url');
}

export function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

export async function saveFingerprintChallenge(params: {
  userId?: string | null;
  type: 'ENROLL' | 'LOGIN';
  challenge: string;
  ttlMs?: number;
}) {
  const ttlMs = params.ttlMs ?? FINGERPRINT_CHALLENGE_TTL_MS;
  const expiresAt = new Date(Date.now() + ttlMs);

  await prisma.fingerprintChallenge.deleteMany({
    where: {
      userId: params.userId ?? null,
      type: params.type,
    },
  });

  return prisma.fingerprintChallenge.create({
    data: {
      userId: params.userId,
      type: params.type,
      challenge: params.challenge,
      expiresAt,
    },
  });
}

export async function getValidFingerprintChallenge(params: {
  userId?: string | null;
  type: 'ENROLL' | 'LOGIN';
}) {
  return prisma.fingerprintChallenge.findFirst({
    where: {
      userId: params.userId ?? null,
      type: params.type,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getValidFingerprintChallengeByValue(params: {
  challenge: string;
  type: 'ENROLL' | 'LOGIN';
  userId?: string | null;
}) {
  return prisma.fingerprintChallenge.findFirst({
    where: {
      challenge: params.challenge,
      type: params.type,
      userId: params.userId ?? null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function clearFingerprintChallenges(params: {
  userId?: string | null;
  type: 'ENROLL' | 'LOGIN';
}) {
  await prisma.fingerprintChallenge.deleteMany({
    where: {
      userId: params.userId ?? null,
      type: params.type,
    },
  });
}

function hashToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function issueFingerprintLoginToken(userId: string) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + FINGERPRINT_LOGIN_TOKEN_TTL_MS);

  await prisma.fingerprintLoginToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

export async function consumeFingerprintLoginToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const token = await prisma.fingerprintLoginToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!token) return null;
  if (token.usedAt) return null;
  if (token.expiresAt.getTime() < Date.now()) return null;

  await prisma.fingerprintLoginToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  return token.user;
}
