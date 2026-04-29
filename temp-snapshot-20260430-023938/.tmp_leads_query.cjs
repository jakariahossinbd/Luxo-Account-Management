const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function replacer(key, value) {
  if (typeof value === 'bigint') return value.toString();
  if (value && value.constructor && value.constructor.name === 'Decimal') return value.toString();
  return value;
}

async function main() {
  const leads = await prisma.lead.findMany({
    where: { notes: { contains: 'seller-dashboard-orders' } },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    select: {
      leadId: true,
      stage: true,
      updatedAt: true,
      createdById: true,
    },
  });

  const leadIds = [...new Set(leads.map((l) => l.leadId).filter(Boolean))];

  const sales = leadIds.length
    ? await prisma.sale.findMany({
        where: { orderId: { in: leadIds } },
        select: {
          orderId: true,
          total: true,
          status: true,
          employeeId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      })
    : [];

  const salesByOrder = sales.reduce((acc, s) => {
    if (!acc[s.orderId]) acc[s.orderId] = [];
    acc[s.orderId].push(s);
    return acc;
  }, {});

  const joinedSummary = leads
    .filter((l) => salesByOrder[l.leadId])
    .map((l) => ({
      leadId: l.leadId,
      stage: l.stage,
      leadUpdatedAt: l.updatedAt,
      createdById: l.createdById,
      sales: salesByOrder[l.leadId],
    }));

  const report = {
    counts: {
      latestLeadsFetched: leads.length,
      uniqueLeadIds: leadIds.length,
      salesRowsForLeadIds: sales.length,
      matchedOrderIds: Object.keys(salesByOrder).length,
      joinedRows: joinedSummary.length,
    },
    leads,
    sales,
    joinedSummary,
  };

  console.log(JSON.stringify(report, replacer, 2));
}

main()
  .catch((e) => {
    console.error('QUERY_ERROR', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
