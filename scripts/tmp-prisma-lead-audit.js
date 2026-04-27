const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalizedDigits = value
    .replace(/[?-?]/g, (digit) => String(digit.charCodeAt(0) - '?'.charCodeAt(0)))
    .replace(/[??]/g, '.');
  const normalized = normalizedDigits.replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractAmountFromNotes(notes) {
  if (!notes) return 0;

  try {
    const parsed = JSON.parse(notes);

    const candidates = [parsed.totalTaka, parsed.tt, parsed.total, parsed.amount, parsed.subtotal, parsed.subTotal, parsed.st];
    for (const candidate of candidates) {
      const value = parseAmount(candidate);
      if (value > 0) return value;
    }

    const subTotalValue = parseAmount(parsed.subTotal ?? parsed.subtotal ?? parsed.st);
    const discountValue = parseAmount(parsed.discount);
    const computedTotal = Math.max(subTotalValue - discountValue, 0);
    if (computedTotal > 0) {
      return computedTotal;
    }
  } catch {
    const amountMatch = notes.match(/(?:total|amount|taka|tk)\s*[:=-]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    if (amountMatch?.[1]) {
      return parseAmount(amountMatch[1]);
    }

    const genericNumberMatches = notes.match(/[-+]?[0-9?-?][0-9?-?,\.??]*/g);
    if (genericNumberMatches?.length) {
      const parsedValues = genericNumberMatches
        .map((token) => parseAmount(token))
        .filter((value) => value > 0);

      if (parsedValues.length > 0) {
        return Math.max(...parsedValues);
      }
    }
  }

  return 0;
}

function isDeliveryMetaStatus(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  const compact = normalized.replace(/[\s_-]+/g, '');
  return (
    normalized === 'delivery' ||
    normalized === 'done' ||
    normalized === 'completed' ||
    normalized === 'delivered' ||
    normalized === 'complete delivery' ||
    compact === 'completedelivery'
  );
}

function hasDeliveryStatus(stage, notes) {
  if (stage === 'DONE') {
    return true;
  }

  if (!notes) {
    return false;
  }

  try {
    const parsed = JSON.parse(notes);
    return isDeliveryMetaStatus(parsed.lastStatus) || isDeliveryMetaStatus(parsed.ls) || isDeliveryMetaStatus(parsed.status);
  } catch {
    return false;
  }
}

function isSellerDashboardOrderSource(notes) {
  if (!notes) {
    return false;
  }

  try {
    const parsed = JSON.parse(notes);
    return parsed.source === 'seller-dashboard-orders';
  } catch {
    return notes.includes('seller-dashboard-orders');
  }
}

function getMonthBounds(date = new Date()) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0),
  };
}

function getLastStatusHint(notes) {
  if (!notes || typeof notes !== 'string') return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed.lastStatus ?? parsed.ls ?? parsed.status ?? null;
  } catch {
    const m = notes.match(/"lastStatus"\s*:\s*"([^"]+)"/i) || notes.match(/lastStatus\s*[:=]\s*([A-Za-z _-]+)/i);
    return m?.[1] ? String(m[1]).trim() : null;
  }
}

(async () => {
  const { start, end } = getMonthBounds();

  const [sellerUsers, sellerEmployees, leads] = await Promise.all([
    prisma.user.findMany({ where: { role: 'SELLER' }, select: { id: true } }),
    prisma.employee.findMany({ where: { user: { role: 'SELLER' } }, select: { id: true, userId: true } }),
    prisma.lead.findMany({
      where: {
        updatedAt: { gte: start, lt: end },
        OR: [
          { notes: { contains: 'seller-dashboard-orders' } },
          { stage: 'DONE' },
        ],
      },
      select: {
        id: true,
        leadId: true,
        stage: true,
        notes: true,
        productNote: true,
        createdById: true,
        assignedToId: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const sellerActorIds = new Set(sellerUsers.map((u) => u.id));
  const sellerEmployeeIds = new Set(sellerEmployees.map((e) => e.id));
  const sellerEmployeeUserIds = new Set(sellerEmployees.map((e) => e.userId));

  const counts = {
    totalQueried: leads.length,
    passSellerLink: 0,
    failSellerLink: 0,
    passDelivery: 0,
    failDelivery: 0,
    amountFromNotes: 0,
    amountFromProductNote: 0,
    amountZero: 0,
    finalIncludedRows: 0,
  };

  const suspicious = [];

  console.log('=== Per-row evaluation ===');

  for (const row of leads) {
    const creatorMatch = sellerActorIds.has(row.createdById) || sellerEmployeeIds.has(row.createdById) || sellerEmployeeUserIds.has(row.createdById);
    const assigneeMatch = !!row.assignedToId && (sellerActorIds.has(row.assignedToId) || sellerEmployeeIds.has(row.assignedToId) || sellerEmployeeUserIds.has(row.assignedToId));
    const sourceMatch = isSellerDashboardOrderSource(row.notes);
    const deliveryMatch = hasDeliveryStatus(row.stage, row.notes);

    const notesAmount = extractAmountFromNotes(row.notes);
    const productAmount = notesAmount > 0 ? 0 : extractAmountFromNotes(row.productNote);
    const amountUsed = notesAmount > 0 ? notesAmount : productAmount;
    const amountSource = notesAmount > 0 ? 'notes' : (productAmount > 0 ? 'productNote' : 'none');

    const sellerLinkPass = creatorMatch || assigneeMatch || sourceMatch;
    const included = sellerLinkPass && deliveryMatch;

    if (sellerLinkPass) counts.passSellerLink++; else counts.failSellerLink++;
    if (deliveryMatch) counts.passDelivery++; else counts.failDelivery++;
    if (amountSource === 'notes') counts.amountFromNotes++;
    if (amountSource === 'productNote') counts.amountFromProductNote++;
    if (amountSource === 'none') counts.amountZero++;
    if (included) counts.finalIncludedRows++;

    const reasons = [];
    if (!sellerLinkPass) reasons.push('excluded:no-seller-link');
    if (!deliveryMatch) reasons.push('excluded:not-delivery');
    if (included && amountSource === 'none') reasons.push('included:amount-zero');
    if (included && amountSource !== 'none') reasons.push(`included:amount-${amountSource}`);

    const lastStatusHint = getLastStatusHint(row.notes);
    if (!deliveryMatch && typeof lastStatusHint === 'string' && /(delivery|complete|completed|done|delivered)/i.test(lastStatusHint)) {
      suspicious.push({
        leadId: row.leadId,
        stage: row.stage,
        lastStatusHint,
        notesPreview: row.notes ? row.notes.slice(0, 180).replace(/\s+/g, ' ') : null,
        blocker: 'lastStatus suggests delivery/completed but hasDeliveryStatus=false',
      });
    }

    console.log(JSON.stringify({
      leadId: row.leadId,
      stage: row.stage,
      updatedAt: row.updatedAt,
      creatorMatch,
      assigneeMatch,
      sourceMatch,
      deliveryMatch,
      amountUsed,
      amountSource,
      reasons,
    }));
  }

  console.log('\n=== Aggregate counts ===');
  console.log(JSON.stringify(counts, null, 2));

  console.log('\n=== Delivery/completed hint but deliveryMatch=false ===');
  if (suspicious.length === 0) {
    console.log('None');
  } else {
    for (const row of suspicious) {
      console.log(JSON.stringify(row));
    }
  }

  await prisma.$disconnect();
})().catch(async (err) => {
  console.error('Script failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
