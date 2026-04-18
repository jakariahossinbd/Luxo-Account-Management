const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  const checks = [
    ['seller5@luxo.tech', '123'],
    ['admin@luxo.com', 'password123'],
  ];

  for (const [email, pw] of checks) {
    const u = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, status: true, passwordHash: true },
    });

    if (!u) {
      console.log(JSON.stringify({ email, exists: false }));
      continue;
    }

    const ok = await bcrypt.compare(pw, u.passwordHash);
    console.log(JSON.stringify({
      email: u.email,
      id: u.id,
      role: u.role,
      status: u.status,
      hasPasswordHash: Boolean(u.passwordHash),
      bcryptMatch: ok,
    }));
  }

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
