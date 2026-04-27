const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadEnvFromDotenv(file = '.env') {
  const p = path.resolve(file);
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const normalizedDigits = value
    .replace(/[?-?]/g, (digit) => String(digit.charCodeAt(0) - '?'.charCodeAt(0)))
    .replace(/[??]/g, '.');
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
    const amountMatch = notes.match(/(?:total|amount|taka|tk)\s*[:=-]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    if (amountMatch?.[1]) return parseAmount(amountMatch[1]);
  }
  return 0;
}

async function main() {
  loadEnvFromDotenv('.env');
  const prisma = new PrismaClient();
  const { start, end } = getMonthBounds(new Date());

  const [sellerUsers, sellerEmployees, doneRows] = await Promise.all([
    prisma.user.findMany({ where: { role: 'SELLER' }, select: { id: true } }),
    prisma.employee.findMany({ where: { user: { role: 'SELLER' } }, select: { id: true, userId: true } }),
    prisma.lead.findMany({
      where: { stage: 'DONE', updatedAt: { gte: start, lt: end } },
      select: { leadId: true, createdById: true, updatedAt: true, notes: true, productNote: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const sellerActorIds = new Set(sellerUsers.map((u) => u.id));
  const sellerEmployeeIds = new Set(sellerEmployees.map((e) => e.id));
  const sellerEmployeeUserIds = new Set(sellerEmployees.map((e) => e.userId));

  let matchUsers = 0, matchEmpIds = 0, matchEmpUserIds = 0, matchAny = 0;
  let sumNotes = 0, sumProductFallbackOnly = 0, sumCombinedLogic = 0;
  let noAmountRows = 0;
  const unmatchedRows = [];
  const fallbackRows = [];

  for (const row of doneRows) {
    const mUser = sellerActorIds.has(row.createdById);
    const mEmpId = sellerEmployeeIds.has(row.createdById);
    const mEmpUser = sellerEmployeeUserIds.has(row.createdById);
    if (mUser) matchUsers++;
    if (mEmpId) matchEmpIds++;
    if (mEmpUser) matchEmpUserIds++;

    if (mUser || mEmpId || mEmpUser) {
      matchAny++;
      const fromNotes = extractAmountFromNotes(row.notes);
      const fromProduct = extractAmountFromNotes(row.productNote);
      sumNotes += fromNotes;
      if (fromNotes > 0) sumCombinedLogic += fromNotes;
      else {
        sumCombinedLogic += fromProduct;
        sumProductFallbackOnly += fromProduct;
        if (fromProduct > 0 && fallbackRows.length < 10) fallbackRows.push({ leadId: row.leadId, createdById: row.createdById, productAmount: fromProduct });
      }
      if (fromNotes <= 0 && fromProduct <= 0) noAmountRows++;
    } else if (unmatchedRows.length < 10) {
      unmatchedRows.push({ leadId: row.leadId, createdById: row.createdById, updatedAt: row.updatedAt });
    }
  }

  const out = {
    monthBounds: { start: start.toISOString(), end: end.toISOString() },
    doneRowsInMonth: doneRows.length,
    sample10: doneRows.slice(0, 10),
    sellerIdSets: {
      sellerUserIdsCount: sellerUsers.length,
      sellerEmployeeIdsCount: sellerEmployees.length,
      sellerEmployeeUserIdsCount: sellerEmployeeUserIds.size,
      sellerUserIds: sellerUsers.map((u) => u.id),
      sellerEmployeeIds: sellerEmployees.map((e) => e.id),
      sellerEmployeeUserIds: [...sellerEmployeeUserIds],
    },
    doneCreatedByMatches: {
      matchesSellerUserIds: matchUsers,
      matchesSellerEmployeeIds: matchEmpIds,
      matchesSellerEmployeeUserIds: matchEmpUserIds,
      matchesAnySetUsedByWalletLogic: matchAny,
      unmatched: doneRows.length - matchAny,
      unmatchedSample: unmatchedRows,
    },
    parsedAmounts: {
      sumFromNotesOnlyOnMatchedRows: sumNotes,
      sumFallbackFromProductNoteWhenNotesMissingOrZero: sumProductFallbackOnly,
      sumUsingWalletLogicNotesThenFallback: sumCombinedLogic,
      matchedRowsWithNoParsedAmountInNotesOrProductNote: noAmountRows,
      fallbackSample: fallbackRows,
    },
  };

  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
