import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: { id: string };
};

async function resolveSaleId(params: RouteContext['params']) {
  return params.id;
}

function saleInclude() {
  return {
    customer: { select: { id: true, name: true, email: true, phone: true } },
    employee: {
      select: {
        id: true,
        employeeCode: true,
        designation: true,
        user: { select: { id: true, name: true, email: true } },
      },
    },
    items: {
      orderBy: { createdAt: 'asc' as const },
      include: {
        product: {
          select: { id: true, sku: true, name: true, imageUrl: true, sellPrice: true, quantity: true },
        },
      },
    },
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saleId = await resolveSaleId(params);
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: saleInclude(),
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    console.error('Error fetching sale detail:', error);
    return NextResponse.json({ error: 'Failed to fetch sale' }, { status: 500 });
  }
}
