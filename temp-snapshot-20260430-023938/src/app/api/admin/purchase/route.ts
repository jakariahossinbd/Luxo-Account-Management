import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        skip,
        take: limit,
        include: {
          supplier: { select: { name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchase.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: purchases,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supplierId, subtotal, discount, tax, total, status, notes } = body;

    if (!supplierId || !total) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get employee ID from session
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const purchase = await prisma.purchase.create({
      data: {
        purchaseOrderNo: `PO-${Date.now()}`,
        supplierId,
        employeeId: employee.id,
        subtotal: parseFloat(subtotal || '0'),
        discount: parseFloat(discount || '0'),
        tax: parseFloat(tax || '0'),
        total: parseFloat(total),
        status: status || 'PENDING',
        notes: notes || '',
      },
      include: { supplier: true, employee: true },
    });

    return NextResponse.json(
      { success: true, data: purchase },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase' },
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
    const { id, subtotal, discount, tax, total, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Purchase ID required' },
        { status: 400 }
      );
    }

    const purchase = await prisma.purchase.update({
      where: { id },
      data: {
        ...(subtotal && { subtotal: parseFloat(subtotal) }),
        ...(discount && { discount: parseFloat(discount) }),
        ...(tax && { tax: parseFloat(tax) }),
        ...(total && { total: parseFloat(total) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: { supplier: true },
    });

    return NextResponse.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Error updating purchase:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase' },
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
      return NextResponse.json(
        { error: 'Purchase ID required' },
        { status: 400 }
      );
    }

    await prisma.purchase.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Purchase deleted' });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    );
  }
}
