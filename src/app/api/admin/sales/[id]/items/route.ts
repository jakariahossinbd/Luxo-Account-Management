import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: { id: string };
};

type ItemBody = {
  productId?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  itemId?: string;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

async function recalculateSale(tx: Prisma.TransactionClient, saleId: string) {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    select: { id: true, discount: true, tax: true },
  });

  if (!sale) {
    throw new Error('Sale not found');
  }

  const items = await tx.saleItem.findMany({
    where: { saleId },
    select: { total: true },
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - sale.discount + sale.tax);

  return tx.sale.update({
    where: { id: saleId },
    data: { subtotal, total },
    include: saleInclude(),
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saleId = params.id;
    const body = (await request.json()) as ItemBody;
    const quantity = Math.max(1, Math.floor(toNumber(body.quantity, 1)));

    if (!body.productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { id: true, status: true },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    if (sale.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cancelled sale cannot be modified' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: body.productId },
      select: { id: true, sellPrice: true, quantity: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    const unitPrice = toNumber(body.unitPrice, product.sellPrice);
    const itemTotal = unitPrice * quantity;

    const updatedSale = await prisma.$transaction(async (tx) => {
      await tx.saleItem.create({
        data: {
          saleId,
          productId: product.id,
          quantity,
          unitPrice,
          total: itemTotal,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { quantity: { decrement: quantity } },
      });

      return recalculateSale(tx, saleId);
    });

    return NextResponse.json({ success: true, data: updatedSale });
  } catch (error) {
    console.error('Error adding sale item:', error);
    return NextResponse.json({ error: 'Failed to add sale item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saleId = params.id;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const existingItem = await prisma.saleItem.findUnique({
      where: { id: itemId },
      select: { id: true, saleId: true, productId: true, quantity: true },
    });

    if (!existingItem || existingItem.saleId !== saleId) {
      return NextResponse.json({ error: 'Sale item not found' }, { status: 404 });
    }

    const updatedSale = await prisma.$transaction(async (tx) => {
      await tx.saleItem.delete({ where: { id: itemId } });

      await tx.product.update({
        where: { id: existingItem.productId },
        data: { quantity: { increment: existingItem.quantity } },
      });

      return recalculateSale(tx, saleId);
    });

    return NextResponse.json({ success: true, data: updatedSale });
  } catch (error) {
    console.error('Error deleting sale item:', error);
    return NextResponse.json({ error: 'Failed to delete sale item' }, { status: 500 });
  }
}
