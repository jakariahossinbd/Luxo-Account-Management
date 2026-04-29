const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
for (const raw of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

async function run() {
  const prisma = new PrismaClient();
  const doneTotal = await prisma.lead.count({ where: { stage: 'DONE' } });
  const latestDone = await prisma.lead.findMany({
    where: { stage: 'DONE' },
    select: { leadId: true, updatedAt: true, createdById: true },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
  const byStage = await prisma.lead.groupBy({ by: ['stage'], _count: { _all: true } });
  console.log(JSON.stringify({ doneTotal, latestDone, byStage }, null, 2));
  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
