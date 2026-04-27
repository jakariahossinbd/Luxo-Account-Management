import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

type LeadMeta = {
  lastStatus?: unknown;
  ls?: unknown;
  status?: unknown;
};

const authSecret = process.env.NEXTAUTH_SECRET || 'luxo-dev-secret';

async function resolveRequestUser(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return {
      id: session.user.id,
      role: session.user.role || null,
      email: session.user.email || null,
    };
  }

  const commonOptions = { req: request, secret: authSecret };
  let token = await getToken(commonOptions);

  if (!token) {
    token = await getToken({ ...commonOptions, cookieName: 'next-auth.session-token' });
  }
  if (!token) {
    token = await getToken({ ...commonOptions, cookieName: '__Secure-next-auth.session-token' });
  }

  if (!token) {
    return null;
  }

  const tokenId = typeof token.id === 'string' ? token.id : null;
  const tokenRole = typeof token.role === 'string' ? token.role : null;
  const tokenEmail = typeof token.email === 'string' ? token.email : null;

  if (tokenId && tokenRole) {
    return { id: tokenId, role: tokenRole, email: tokenEmail };
  }

  if (tokenEmail) {
    const user = await prisma.user.findUnique({
      where: { email: tokenEmail },
      select: { id: true, role: true, email: true },
    });

    if (user) {
      return {
        id: user.id,
        role: user.role,
        email: user.email,
      };
    }
  }

  return null;
}

function parseAmount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalizedDigits = value
    .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - '০'.charCodeAt(0)))
    .replace(/[٫٬]/g, '.');
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

function extractAmountFromNotes(notes: string | null) {
  if (!notes) return 0;

  try {
    const parsed = JSON.parse(notes) as {
      totalTaka?: unknown;
      total?: unknown;
      amount?: unknown;
      subtotal?: unknown;
      subTotal?: unknown;
      tt?: unknown;
      st?: unknown;
    };

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
    const amountMatch = notes.match(/(?:total|amount|taka|tk|৳)\s*[:=-]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    if (amountMatch?.[1]) {
      return parseAmount(amountMatch[1]);
    }

    // Fallback for free-text entries like "1200" or "price 1500 2pcs" without explicit amount labels.
    const genericNumberMatches = notes.match(/[-+]?[0-9০-৯][0-9০-৯,\.٫٬]*/g);
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

function isDeliveryMetaStatus(value: unknown) {
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

function hasDeliveryStatus(stage: string, notes: string | null) {
  if (stage === 'DONE') {
    return true;
  }

  if (!notes) {
    return false;
  }

  try {
    const parsed = JSON.parse(notes) as LeadMeta;
    return isDeliveryMetaStatus(parsed.lastStatus) || isDeliveryMetaStatus(parsed.ls) || isDeliveryMetaStatus(parsed.status);
  } catch {
    return false;
  }
}

function isSellerDashboardOrderSource(notes: string | null) {
  if (!notes) {
    return false;
  }

  try {
    const parsed = JSON.parse(notes) as { source?: unknown };
    return parsed.source === 'seller-dashboard-orders';
  } catch {
    return notes.includes('seller-dashboard-orders');
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await resolveRequestUser(request);
    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start, end } = getMonthBounds();

    const [sellerUsers, sellerEmployees, deliveryRows, completedSales, expenseAggregate] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'SELLER',
        },
        select: { id: true },
      }),
      prisma.employee.findMany({
        where: {
          user: {
            role: 'SELLER',
          },
        },
        select: {
          id: true,
          userId: true,
        },
      }),
      prisma.lead.findMany({
        where: {
          updatedAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          stage: true,
          notes: true,
          productNote: true,
          createdById: true,
          assignedToId: true,
        },
      }),
      prisma.sale.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          total: true,
          employeeId: true,
        },
      }),
      prisma.expense.aggregate({
        where: {
          date: {
            gte: start,
            lt: end,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const sellerActorIds = new Set(sellerUsers.map((user) => user.id));
    const sellerEmployeeIds = new Set(sellerEmployees.map((employee) => employee.id));
    const sellerEmployeeUserIds = new Set(sellerEmployees.map((employee) => employee.userId));

    const leadsInflows = deliveryRows.reduce((sum, row) => {
      const hasKnownSellerCreator =
        sellerActorIds.has(row.createdById) || sellerEmployeeIds.has(row.createdById) || sellerEmployeeUserIds.has(row.createdById);
      const hasKnownSellerAssignee =
        !!row.assignedToId &&
        (sellerActorIds.has(row.assignedToId) ||
          sellerEmployeeIds.has(row.assignedToId) ||
          sellerEmployeeUserIds.has(row.assignedToId));
      const isSellerSourceRow = isSellerDashboardOrderSource(row.notes);

      // Include rows when linked to sellers by creator, assignee, or seller-board source marker.
      if (!hasKnownSellerCreator && !hasKnownSellerAssignee && !isSellerSourceRow) {
        return sum;
      }

      // Keep inflow strictly for completed delivery rows.
      if (!hasDeliveryStatus(row.stage, row.notes)) {
        return sum;
      }

      const fromNotes = extractAmountFromNotes(row.notes);
      if (fromNotes > 0) {
        return sum + fromNotes;
      }

      // Older rows may store amount-like text in productNote.
      return sum + extractAmountFromNotes(row.productNote);
    }, 0);

    const salesInflows = completedSales.reduce((sum, row) => {
      if (!sellerEmployeeIds.has(row.employeeId)) {
        return sum;
      }

      return sum + (Number.isFinite(row.total) ? row.total : 0);
    }, 0);

    // Inflows track seller complete-delivery activity from both seller-board orders and sales table.
    const inflows = leadsInflows + salesInflows;

    // Outflows come only from admin expense records. Seller monthly default expense is not included.
    const outflows = expenseAggregate._sum.amount || 0;
    const balance = inflows - outflows;

    return NextResponse.json({
      success: true,
      data: {
        inflows,
        outflows,
        balance,
      },
    });
  } catch (error) {
    console.error('Admin wallets error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallets data' }, { status: 500 });
  }
}
