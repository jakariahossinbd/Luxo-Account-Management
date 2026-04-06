import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateInvoiceNumber } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

type SaleStatusValue = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
type PaymentMethodValue = 'CASH' | 'BANK' | 'CARD';

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseSaleStatus(value: unknown): SaleStatusValue {
  return value === 'PROCESSING' || value === 'COMPLETED' || value === 'CANCELLED' ? value : 'PENDING';
}

function parsePaymentMethod(value: unknown): PaymentMethodValue {
  return value === 'BANK' || value === 'CARD' ? value : 'CASH';
}

async function resolveEmployeeId(userId: string) {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (employee) {
    return employee.id;
  }

  const fallbackEmployee = await prisma.employee.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  return fallbackEmployee?.id ?? null;
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        skip,
        take: limit,
        include: saleInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sale.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: sales,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, subtotal, discount, tax, total, status, paymentMethod, paymentStatus, notes } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const employeeId = await resolveEmployeeId(session.user.id);

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const subtotalAmount = toNumber(subtotal);
    const discountAmount = toNumber(discount);
    const taxAmount = toNumber(tax);
    const serverTotal = Math.max(0, subtotalAmount - discountAmount + taxAmount);

    const sale = await prisma.sale.create({
      data: {
        orderId: `ORD-${Date.now()}`,
        invoiceNumber: generateInvoiceNumber(),
        customerId,
        employeeId,
        subtotal: subtotalAmount,
        discount: discountAmount,
        tax: taxAmount,
        total: serverTotal,
        paymentMethod: parsePaymentMethod(paymentMethod),
        paymentStatus: paymentStatus === 'PAID' || paymentStatus === 'PARTIAL' ? paymentStatus : 'PENDING',
        status: parseSaleStatus(status),
        notes: notes || '',
      },
      include: saleInclude(),
    });

    return NextResponse.json(
      { success: true, data: sale },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, subtotal, discount, tax, total, status, paymentMethod, paymentStatus, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Sale ID required' }, { status: 400 });
    }

    const subtotalAmount = subtotal !== undefined ? toNumber(subtotal) : undefined;
    const discountAmount = discount !== undefined ? toNumber(discount) : undefined;
    const taxAmount = tax !== undefined ? toNumber(tax) : undefined;
    const totalAmount =
      subtotalAmount !== undefined || discountAmount !== undefined || taxAmount !== undefined
        ? Math.max(
            0,
            (subtotalAmount ?? 0) - (discountAmount ?? 0) + (taxAmount ?? 0)
          )
        : undefined;

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        ...(subtotalAmount !== undefined && { subtotal: subtotalAmount }),
        ...(discountAmount !== undefined && { discount: discountAmount }),
        ...(taxAmount !== undefined && { tax: taxAmount }),
        ...(totalAmount !== undefined && { total: totalAmount }),
        ...(paymentMethod && { paymentMethod: parsePaymentMethod(paymentMethod) }),
        ...(paymentStatus && {
          paymentStatus:
            paymentStatus === 'PAID' || paymentStatus === 'PARTIAL' ? paymentStatus : 'PENDING',
        }),
        ...(status && { status: parseSaleStatus(status) }),
        ...(notes !== undefined && { notes }),
      },
      include: saleInclude(),
    });

    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json(
      { error: 'Failed to update sale' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Sale ID required' }, { status: 400 });
    }

    await prisma.sale.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Sale deleted' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    );
  }
}
