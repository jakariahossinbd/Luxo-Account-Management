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

    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const salesData = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const [sales, purchases, expenses] = await Promise.all([
          prisma.sale.aggregate({
            where: {
              paymentStatus: 'PAID',
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
            _sum: { total: true },
          }),
          prisma.purchase.aggregate({
            where: {
              paymentStatus: 'PAID',
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
            _sum: { total: true },
          }),
          prisma.expense.aggregate({
            where: {
              paymentStatus: 'PAID',
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          sales: sales._sum.total || 0,
          purchases: purchases._sum.total || 0,
          expenses: expenses._sum.amount || 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: salesData });
  } catch (error) {
    console.error('Dashboard chart data error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
