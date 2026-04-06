import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [totalLeads, sellers, marketing, sales, leads] = await Promise.all([
      prisma.lead.count(),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.user.count({ where: { role: 'MARKETING' } }),
      prisma.sale.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalLeads,
          sellers,
          marketing,
          sales: sales._sum.total || 0,
        },
        leads,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
