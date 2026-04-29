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

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const [monthlySales, todaySales, cancelledAmount, leads, pendingLeads] = await Promise.all([
      prisma.sale.aggregate({
        where: { 
          employeeId: employee.id,
          createdAt: { gte: startOfMonth },
          paymentStatus: 'PAID',
          status: { not: 'CANCELLED' },
        },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: { 
          employeeId: employee.id,
          createdAt: { gte: startOfDay },
          paymentStatus: 'PAID',
          status: { not: 'CANCELLED' },
        },
        _sum: { total: true },
      }),
      prisma.sale.aggregate({
        where: { 
          employeeId: employee.id,
          status: 'CANCELLED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
      prisma.lead.count({
        where: { createdById: session.user.id },
      }),
      prisma.lead.count({
        where: { createdById: session.user.id, stage: 'LEAD' },
      }),
    ]);

    const recentOrders = await prisma.sale.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });

    const target = 200000;
    const totalSales = monthlySales._sum.total || 0;
    const targetProgress = Math.round((totalSales / target) * 100);

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        todaySales: todaySales._sum.total || 0,
        cancelAmount: cancelledAmount._sum.total || 0,
        target,
        targetProgress,
        totalLeads: leads,
        pendingLeads,
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          orderId: order.orderId,
          customer: order.customer?.name || 'Unknown',
          phone: order.customer?.phone || '',
          amount: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Seller dashboard error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
