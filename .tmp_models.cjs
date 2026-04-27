const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log(Object.keys(prisma).filter((k) => !k.startsWith('_')).sort());
}

main().finally(async () => {
  await prisma.$disconnect();
});
