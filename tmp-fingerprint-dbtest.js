const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findUnique({ where: { email: 'seller5@luxo.tech' }, select: { id: true } });
  console.log('user', user);
  const del = await prisma.fingerprintChallenge.deleteMany({ where: { userId: user.id, type: 'ENROLL' } });
  console.log('deleteMany', del);
  const created = await prisma.fingerprintChallenge.create({ data: { userId: user.id, type: 'ENROLL', challenge: 'test_challenge', expiresAt: new Date(Date.now()+60000) } });
  console.log('created', { id: created.id, userId: created.userId, type: created.type });
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('ERR', e);
  await prisma.$disconnect();
  process.exit(1);
});
