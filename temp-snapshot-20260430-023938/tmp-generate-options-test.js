const { PrismaClient } = require('@prisma/client');
const { generateRegistrationOptions } = require('@simplewebauthn/server');
const prisma = new PrismaClient();

function getWebAuthnOrigin() {
  return process.env.WEBAUTHN_ORIGIN || process.env.NEXTAUTH_URL || 'http://localhost:3000';
}
function getWebAuthnRpID() {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  try { return new URL(getWebAuthnOrigin()).hostname; } catch { return 'localhost'; }
}

(async () => {
  const user = await prisma.user.findUnique({
    where: { email: 'seller5@luxo.tech' },
    select: { id: true, email: true, name: true, webauthnCredentials: { select: { credentialId: true } } }
  });
  console.log('userIdType', typeof user.id, user.id);
  console.log('rpID', getWebAuthnRpID());
  const options = await generateRegistrationOptions({
    rpName: 'Luxo Account Management',
    rpID: getWebAuthnRpID(),
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name,
    timeout: 60000,
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
  console.log('challengeLen', options.challenge.length);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('ERR_MESSAGE', e?.message);
  console.error('ERR_STACK', e?.stack?.split('\n').slice(0,4).join('\n'));
  await prisma.$disconnect();
  process.exit(1);
});
