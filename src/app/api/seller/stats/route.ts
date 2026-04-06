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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [monthlySales, todaySales, cancelled, leads, pending] = await Promise.all([
      prisma.sale.aggregate({
        where: { 
          employeeId: session.user.id,
          createdAt: { gte: startOfMonth },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: { 
          employeeId: session.user.id,
          createdAt: { gte: startOfDay },
          paymentStatus: 'PAID',
        },
        _sum: { total: true },
      }),
      prisma.sale.count({
        where: { 
          employeeId: session.user.id,
          status: 'CANCELLED',
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.lead.count({
        where: { createdById: session.user.id },
      }),
      prisma.lead.count({
        where: { createdById: session.user.id, stage: 'LEAD' },
      }),
    ]);

    const totalSales = monthlySales._sum.total || 0;
    const rating = Math.min(Math.floor(totalSales / 20000), 5);

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        cancelAmount: 0,
        target: 100000,
        rating,
        todaySales: todaySales._sum.total || 0,
        cancelled,
        pending,
        totalLeads: leads,
      },
    });
  } catch (error) {
    console.error('Seller stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
