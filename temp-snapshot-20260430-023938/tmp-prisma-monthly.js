const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), 1);
const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const monthFilter = { gte: start, lt: end };

const toNum = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

(async () => {
  const byStage = await prisma.lead
    .groupBy({
      by: ['stage'],
      where: { updatedAt: monthFilter },
      _count: { _all: true },
      orderBy: { _count: { stage: 'desc' } },
    })
    .catch(async () => {
      const rows = await prisma.lead.findMany({
        where: { updatedAt: monthFilter },
        select: { stage: true },
      });
      const map = {};
      for (const r of rows) map[r.stage ?? 'null'] = (map[r.stage ?? 'null'] || 0) + 1;
      return Object.entries(map)
        .map(([stage, count]) => ({ stage, _count: { _all: count } }))
        .sort((a, b) => b._count._all - a._count._all);
    });

  const sellerRows = await prisma.lead.findMany({
    where: { updatedAt: monthFilter, notes: { contains: 'seller-dashboard-orders' } },
    select: { stage: true },
  });
  const sellerMap = {};
  for (const r of sellerRows) sellerMap[r.stage ?? 'null'] = (sellerMap[r.stage ?? 'null'] || 0) + 1;
  const sellerByStage = Object.entries(sellerMap)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count);

  const top = await prisma.lead.findMany({
    where: { updatedAt: monthFilter, notes: { contains: 'seller-dashboard-orders' } },
    orderBy: { updatedAt: 'desc' },
    take: 15,
    select: {
      leadId: true,
      stage: true,
      createdById: true,
      updatedAt: true,
      notes: true,
      productNote: true,
    },
  });

  const parsedTop = top.map((r) => {
    let lastStatus = null;
    let totalTaka = null;
    try {
      const n = typeof r.notes === 'string' ? JSON.parse(r.notes) : r.notes;
      if (n && typeof n === 'object') {
        lastStatus = n.lastStatus ?? null;
        totalTaka = toNum(n.totalTaka ?? n.total_taka ?? n.total ?? null);
        if (totalTaka == null && Array.isArray(n.orders)) {
          totalTaka = n.orders.reduce((s, o) => s + (toNum(o.totalTaka ?? o.total ?? 0) || 0), 0);
        }
      }
    } catch {}
    return {
      leadId: r.leadId,
      stage: r.stage,
      createdById: r.createdById,
      updatedAt: r.updatedAt,
      lastStatus,
      totalTaka,
      productNote: r.productNote,
    };
  });

  const fmt = (v) => (v === null || v === undefined ? '' : String(v));

  console.log('1) Leads updated this month by stage');
  console.log('stage\tcount');
  for (const r of byStage) {
    const c = r._count ? (r._count._all ?? r._count.stage ?? r._count) : r.count;
    console.log(`${fmt(r.stage)}\t${c}`);
  }

  console.log('');
  console.log('2) seller-dashboard-orders leads updated this month by stage');
  console.log('stage\tcount');
  for (const r of sellerByStage) {
    console.log(`${fmt(r.stage)}\t${r.count}`);
  }

  console.log('');
  console.log('3) Top 15 latest seller-dashboard-orders leads (this month)');
  console.log('leadId\tstage\tcreatedById\tupdatedAt\tlastStatus\ttotalTaka\tproductNote');
  for (const r of parsedTop) {
    console.log(
      `${fmt(r.leadId)}\t${fmt(r.stage)}\t${fmt(r.createdById)}\t${
        r.updatedAt ? new Date(r.updatedAt).toISOString() : ''
      }\t${fmt(r.lastStatus)}\t${fmt(r.totalTaka)}\t${fmt(r.productNote)}`
    );
  }
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
