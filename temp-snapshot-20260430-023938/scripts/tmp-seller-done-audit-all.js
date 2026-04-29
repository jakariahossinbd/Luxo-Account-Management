const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseNotes(notes) {
  if (!notes) return { lastStatus: null };
  try {
    const parsed = JSON.parse(notes);
    return { lastStatus: parsed?.lastStatus ?? parsed?.ls ?? parsed?.status ?? null };
  } catch {
    const m = String(notes).match(/"lastStatus"\s*:\s*"([^"]+)"/i);
    return { lastStatus: m?.[1] ?? null };
  }
}

(async () => {
  const rows = await prisma.lead.findMany({
    where: { notes: { contains: 'seller-dashboard-orders' } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { leadId: true, stage: true, createdById: true, updatedAt: true, notes: true },
  });

  const allDone = await prisma.lead.findMany({
    where: { notes: { contains: 'seller-dashboard-orders' }, stage: 'DONE' },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { leadId: true, stage: true, createdById: true, updatedAt: true, notes: true },
  });

  console.log(JSON.stringify({
    sellerDashboardRows: rows.map((r) => ({
      leadId: r.leadId,
      stage: r.stage,
      createdById: r.createdById,
      updatedAt: r.updatedAt.toISOString(),
      lastStatus: parseNotes(r.notes).lastStatus,
    })),
    sellerDashboardDoneRows: allDone.map((r) => ({
      leadId: r.leadId,
      stage: r.stage,
      createdById: r.createdById,
      updatedAt: r.updatedAt.toISOString(),
      lastStatus: parseNotes(r.notes).lastStatus,
    })),
  }, null, 2));
})().finally(async () => prisma.$disconnect());
