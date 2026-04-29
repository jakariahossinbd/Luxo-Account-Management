import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [recentSales, recentExpenses] = await Promise.all([
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          employee: { include: { user: true } },
        },
      }),
      prisma.expense.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          employee: { include: { user: true } },
        },
      }),
    ]);

    const activities = [
      ...recentSales.map((sale) => ({
        id: sale.id,
        type: 'SALE',
        description: sale.customer
          ? `Sale to ${sale.customer.name}`
          : `Sale #${sale.orderId}`,
        amount: sale.total,
        createdAt: sale.createdAt.toISOString(),
      })),
      ...recentExpenses.map((expense) => ({
        id: expense.id,
        type: 'EXPENSE',
        description: expense.description,
        amount: expense.amount,
        createdAt: expense.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return NextResponse.json({ success: true, data: activities });
  } catch (error) {
    console.error('Recent activities error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
