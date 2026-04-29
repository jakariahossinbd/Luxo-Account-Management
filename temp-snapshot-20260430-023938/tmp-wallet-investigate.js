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

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const normalizedDigits = value
    .replace(/[?-?]/g, (digit) => String(digit.charCodeAt(0) - '?'.charCodeAt(0)))
    .replace(/[.,]/g, '.');
  const normalized = normalizedDigits.replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getMonthBounds(date = new Date()) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0),
  };
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
    if (computedTotal > 0) return computedTotal;
  } catch {
    const amountMatch = notes.match(/(?:total|amount|taka|tk)\\s*[:=-]?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)/i);
    if (amountMatch?.[1]) return parseAmount(amountMatch[1]);
    const genericNumberMatches = notes.match(/[-+]?[0-9][0-9,\\.]*/g);
    if (genericNumberMatches?.length) {
      const parsedValues = genericNumberMatches.map((t) => parseAmount(t)).filter((n) => n > 0);
      if (parsedValues.length > 0) return Math.max(...parsedValues);
    }
  }
  return 0;
}

function isDeliveryMetaStatus(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'delivery' || normalized === 'done' || normalized === 'completed' || normalized === 'delivered';
}

function hasDeliveryStatus(stage, notes) {
  if (stage === 'DONE') return true;
  if (!notes) return false;
  try {
    const parsed = JSON.parse(notes);
    return isDeliveryMetaStatus(parsed.lastStatus);
  } catch {
    return false;
  }
}

function noteSnippet(s) {
  if (!s) return null;
  return s.length > 140 ? s.slice(0, 140) + '…' : s;
}

(async () => {
  const prisma = new PrismaClient();
  const { start, end } = getMonthBounds(new Date());

  const [leads, sellerUsers, sellerEmployees] = await Promise.all([
    prisma.lead.findMany({
      where: { updatedAt: { gte: start, lt: end } },
      select: {
        leadId: true,
        createdById: true,
        assignedToId: true,
        stage: true,
        updatedAt: true,
        notes: true,
        productNote: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.user.findMany({ where: { role: 'SELLER' }, select: { id: true, name: true, email: true, status: true } }),
    prisma.employee.findMany({ where: { user: { role: 'SELLER' } }, select: { id: true, userId: true, employeeCode: true, designation: true, status: true } }),
  ]);

  const stageCounts = {};
  for (const l of leads) {
    let parsed = null;
    try { parsed = l.notes ? JSON.parse(l.notes) : null; } catch {}
    const text = l.notes || '';
    const hasTotalTaka = !!(parsed && Object.prototype.hasOwnProperty.call(parsed, 'totalTaka')) || /"totalTaka"/i.test(text);
    const hasSubTotal = !!(parsed && (Object.prototype.hasOwnProperty.call(parsed, 'subTotal') || Object.prototype.hasOwnProperty.call(parsed, 'subtotal'))) || /"subTotal"|"subtotal"/i.test(text);
    const hasDiscount = !!(parsed && Object.prototype.hasOwnProperty.call(parsed, 'discount')) || /"discount"/i.test(text);
    const hasSourceMarker = !!(parsed && parsed.source === 'seller-dashboard-orders') || /seller-dashboard-orders/i.test(text);
    const key = l.stage;
    stageCounts[key] ||= { total: 0, hasTotalTaka: 0, hasSubTotal: 0, hasDiscount: 0, hasSourceMarker: 0 };
    stageCounts[key].total++;
    if (hasTotalTaka) stageCounts[key].hasTotalTaka++;
    if (hasSubTotal) stageCounts[key].hasSubTotal++;
    if (hasDiscount) stageCounts[key].hasDiscount++;
    if (hasSourceMarker) stageCounts[key].hasSourceMarker++;
  }

  const doneSample = leads
    .filter((l) => l.stage === 'DONE')
    .slice(0, 15)
    .map((l) => ({
      leadId: l.leadId,
      createdById: l.createdById,
      assignedToId: l.assignedToId,
      stage: l.stage,
      updatedAt: l.updatedAt,
      notesSnippet: noteSnippet(l.notes),
      productNote: l.productNote,
    }));

  const sellerActorIds = new Set(sellerUsers.map((u) => u.id));
  const sellerEmployeeIds = new Set(sellerEmployees.map((e) => e.id));
  const sellerEmployeeUserIds = new Set(sellerEmployees.map((e) => e.userId));

  const exclusionCounts = { creatorMismatch: 0, noDeliveryStatus: 0, amountZero: 0, included: 0 };
  const excludedSamples = { creatorMismatch: [], noDeliveryStatus: [], amountZero: [] };
  const includedSample = [];

  for (const row of leads) {
    const creatorOk = sellerActorIds.has(row.createdById) || sellerEmployeeIds.has(row.createdById) || sellerEmployeeUserIds.has(row.createdById);
    if (!creatorOk) {
      exclusionCounts.creatorMismatch++;
      if (excludedSamples.creatorMismatch.length < 15) excludedSamples.creatorMismatch.push({ leadId: row.leadId, createdById: row.createdById, stage: row.stage, updatedAt: row.updatedAt, notesSnippet: noteSnippet(row.notes) });
      continue;
    }

    if (!hasDeliveryStatus(row.stage, row.notes)) {
      exclusionCounts.noDeliveryStatus++;
      if (excludedSamples.noDeliveryStatus.length < 15) excludedSamples.noDeliveryStatus.push({ leadId: row.leadId, createdById: row.createdById, stage: row.stage, updatedAt: row.updatedAt, notesSnippet: noteSnippet(row.notes) });
      continue;
    }

    const fromNotes = extractAmountFromNotes(row.notes);
    const fromProduct = extractAmountFromNotes(row.productNote);
    const finalAmount = fromNotes > 0 ? fromNotes : fromProduct;
    if (finalAmount <= 0) {
      exclusionCounts.amountZero++;
      if (excludedSamples.amountZero.length < 15) excludedSamples.amountZero.push({ leadId: row.leadId, createdById: row.createdById, stage: row.stage, updatedAt: row.updatedAt, notesSnippet: noteSnippet(row.notes), productNote: row.productNote, fromNotes, fromProduct });
      continue;
    }

    exclusionCounts.included++;
    if (includedSample.length < 20) includedSample.push({ leadId: row.leadId, createdById: row.createdById, stage: row.stage, updatedAt: row.updatedAt, amountUsed: finalAmount, amountSource: fromNotes > 0 ? 'notes' : 'productNote', notesSnippet: noteSnippet(row.notes), productNote: row.productNote });
  }

  const completeDeliverySellerOrders = leads.filter((l) => {
    try {
      const p = l.notes ? JSON.parse(l.notes) : null;
      const isSource = p?.source === 'seller-dashboard-orders' || /seller-dashboard-orders/i.test(l.notes || '');
      const isComplete = l.stage === 'DONE' || isDeliveryMetaStatus(p?.lastStatus);
      return isSource && isComplete;
    } catch {
      return /seller-dashboard-orders/i.test(l.notes || '') && l.stage === 'DONE';
    }
  });

  const completeDeliveryMisses = completeDeliverySellerOrders.filter((row) => {
    const creatorOk = sellerActorIds.has(row.createdById) || sellerEmployeeIds.has(row.createdById) || sellerEmployeeUserIds.has(row.createdById);
    const deliveryOk = hasDeliveryStatus(row.stage, row.notes);
    const fromNotes = extractAmountFromNotes(row.notes);
    const fromProduct = extractAmountFromNotes(row.productNote);
    const amountOk = (fromNotes > 0 ? fromNotes : fromProduct) > 0;
    return !(creatorOk && deliveryOk && amountOk);
  }).map((row) => {
    const creatorOk = sellerActorIds.has(row.createdById) || sellerEmployeeIds.has(row.createdById) || sellerEmployeeUserIds.has(row.createdById);
    const deliveryOk = hasDeliveryStatus(row.stage, row.notes);
    const fromNotes = extractAmountFromNotes(row.notes);
    const fromProduct = extractAmountFromNotes(row.productNote);
    const amountOk = (fromNotes > 0 ? fromNotes : fromProduct) > 0;
    return {
      leadId: row.leadId,
      createdById: row.createdById,
      assignedToId: row.assignedToId,
      stage: row.stage,
      updatedAt: row.updatedAt,
      fromNotes,
      fromProduct,
      reason: !creatorOk ? 'creatorMismatch' : !deliveryOk ? 'noDeliveryStatus' : !amountOk ? 'amountZero' : 'included',
      notesSnippet: noteSnippet(row.notes),
      productNote: row.productNote,
    };
  });

  const out = {
    monthBounds: { start: start.toISOString(), end: end.toISOString() },
    step1_stageCounts: stageCounts,
    step2_doneLeadSample: doneSample,
    step3_sellers: {
      sellerUsers,
      sellerEmployees,
      userToEmployeeMap: sellerEmployees.map((e) => ({ userId: e.userId, employeeId: e.id, employeeCode: e.employeeCode }))
    },
    step4_walletFiltering: {
      totals: exclusionCounts,
      excludedSamples,
      includedSample,
      completeDeliverySellerOrdersCount: completeDeliverySellerOrders.length,
      completeDeliverySellerOrdersMissedCount: completeDeliveryMisses.length,
      completeDeliverySellerOrdersMissedSample: completeDeliveryMisses.slice(0, 30),
    }
  };

  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

