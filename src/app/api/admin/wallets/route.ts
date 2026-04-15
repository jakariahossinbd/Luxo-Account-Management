import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const sourceMarker = '"source":"seller-dashboard-orders"';

function parseAmount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalized = value.replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getMonthBounds(date = new Date()) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0),
  };
}

function parseDisplayDate(value: unknown) {
  if (typeof value !== 'string') return null;

  const [day, month, year] = value.split('/').map((part) => Number.parseInt(part, 10));
  if (!day || !month || !year) return null;

  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameMonthAndYear(date: Date, reference: Date) {
  return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear();
}

function extractAmountFromNotes(notes: string | null) {
  if (!notes) return 0;

  try {
    const parsed = JSON.parse(notes) as {
      totalTaka?: unknown;
      total?: unknown;
      amount?: unknown;
      subtotal?: unknown;
    };

    const candidates = [parsed.totalTaka, parsed.total, parsed.amount, parsed.subtotal];
    for (const candidate of candidates) {
      const value = parseAmount(candidate);
      if (value > 0) return value;
    }
  } catch {
    const amountMatch = notes.match(/(?:total|amount|taka|tk|৳)\s*[:=-]?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    if (amountMatch?.[1]) {
      return parseAmount(amountMatch[1]);
    }
  }

  return 0;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { start, end } = getMonthBounds();

    const [sellerUsers, deliveryRows, completedSalesRows, expenseAggregate] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'SELLER' },
        select: { id: true },
      }),
      prisma.lead.findMany({
        where: {
          stage: 'DONE',
        },
        select: {
          notes: true,
          createdAt: true,
          createdById: true,
        },
      }),
      prisma.sale.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          total: true,
          employee: {
            select: {
              userId: true,
            },
          },
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

    const sellerIds = new Set(sellerUsers.map((user) => user.id));
    const now = new Date();

    const leadsInflows = deliveryRows.reduce((sum, row) => {
      if (!sellerIds.has(row.createdById)) {
        return sum;
      }

      let effectiveDate = row.createdAt;
      if (row.notes) {
        try {
          const parsed = JSON.parse(row.notes) as { date?: unknown };
          effectiveDate = parseDisplayDate(parsed.date) || row.createdAt;
        } catch {
          effectiveDate = row.createdAt;
        }
      }

      if (!isSameMonthAndYear(effectiveDate, now)) {
        return sum;
      }

      return sum + extractAmountFromNotes(row.notes);
    }, 0);

    const salesInflows = completedSalesRows.reduce((sum, row) => {
      if (!sellerIds.has(row.employee.userId)) {
        return sum;
      }

      return sum + parseAmount(row.total);
    }, 0);

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
