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

    // Only admins can access company-level financial summary
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin only' },
        { status: 403 }
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalSales,
      totalPurchase,
      totalExpense,
      products,
      employees,
      lastMonthSales,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.purchase.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.product.aggregate({
        where: { status: true },
        _sum: { quantity: true, costPrice: true },
      }),
      prisma.employee.count({
        where: { status: true },
      }),
      prisma.sale.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: { total: true },
      }),
    ]);

    const salesTotal = totalSales._sum.total || 0;
    const purchaseTotal = totalPurchase._sum.total || 0;
    const expenseTotal = totalExpense._sum.amount || 0;
    const lastMonthTotal = lastMonthSales._sum.total || 0;

    const salesChange = lastMonthTotal > 0 
      ? ((salesTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    const stockValue = (products._sum.quantity || 0) * ((products._sum.costPrice || 0) / Math.max((products._sum.quantity || 0), 1));

    return NextResponse.json({
      success: true,
      data: {
        totalSales: salesTotal,
        totalPurchase: purchaseTotal,
        totalExpense: expenseTotal,
        totalProfit: salesTotal - purchaseTotal - expenseTotal,
        stockValue: stockValue,
        totalEmployees: employees,
        salesChange: Math.round(salesChange),
        purchaseChange: 0,
        expenseChange: 0,
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
