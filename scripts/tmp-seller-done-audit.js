const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseNotes(notes) {
  if (!notes) return { lastStatus: null, source: null };
  try {
    const parsed = JSON.parse(notes);
    return {
      lastStatus: parsed?.lastStatus ?? parsed?.ls ?? parsed?.status ?? null,
      source: parsed?.source ?? null,
    };
  } catch {
    const m = String(notes).match(/"lastStatus"\s*:\s*"([^"]+)"/i);
    return { lastStatus: m?.[1] ?? null, source: notes.includes('seller-dashboard-orders') ? 'seller-dashboard-orders' : null };
  }
}

(async () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  const latest = await prisma.lead.findMany({
    where: { notes: { contains: 'seller-dashboard-orders' } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { leadId: true, stage: true, createdById: true, updatedAt: true, notes: true },
  });

  const doneCount = await prisma.lead.count({
    where: { stage: 'DONE', updatedAt: { gte: start, lt: end } },
  });

  const sellerDoneCount = await prisma.lead.count({
    where: { stage: 'DONE', updatedAt: { gte: start, lt: end }, notes: { contains: 'seller-dashboard-orders' } },
  });

  const rows = latest.map((r) => {
    const parsed = parseNotes(r.notes);
    return {
      leadId: r.leadId,
      stage: r.stage,
      createdById: r.createdById,
      updatedAt: r.updatedAt.toISOString(),
      lastStatus: parsed.lastStatus,
    };
  });

  console.log(JSON.stringify({
    monthStart: start.toISOString(),
    monthEnd: end.toISOString(),
    doneCount,
    sellerDoneCount,
    latest20: rows,
  }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
