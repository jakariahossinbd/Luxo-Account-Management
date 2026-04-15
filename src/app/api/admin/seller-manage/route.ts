import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateEmployeeCode } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createSellerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional().default(''),
  sellerId: z.string().min(2, 'Seller ID is required').optional(),
  designation: z.string().min(2, 'Designation is required').optional().default('Seller'),
  salesTargetAmount: z.coerce.number().int().min(1).max(99).optional().default(1),
  monthlyExpensesAmount: z.coerce.number().min(0).optional().default(0),
});

function normalizeSalesTargetCount(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(99, Math.max(1, parsed));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSellerSchema.parse(body);
    const employeeCode = parsed.sellerId?.trim() || generateEmployeeCode();

    const existingUser = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const existingSeller = await prisma.employee.findUnique({ where: { employeeCode } });
    if (existingSeller) {
      return NextResponse.json({ error: 'Seller ID already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.email,
          passwordHash,
          name: parsed.name,
          phone: parsed.phone,
          role: 'SELLER',
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          employeeCode,
          designation: parsed.designation || 'Seller',
          salesTargetAmount: normalizeSalesTargetCount(parsed.salesTargetAmount),
          monthlyExpensesAmount: parsed.monthlyExpensesAmount || 0,
          status: true,
        },
      });

      return { user, employee };
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.employee.id,
        userId: result.employee.userId,
        sellerId: result.employee.employeeCode,
        name: result.user.name,
        email: result.user.email,
        salesTargetAmount: result.employee.salesTargetAmount,
        monthlyExpensesAmount: result.employee.monthlyExpensesAmount,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error('Error creating seller:', error);
    return NextResponse.json({ error: 'Failed to create seller' }, { status: 500 });
  }
}

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

    const [sellers, total] = await Promise.all([
      prisma.employee.findMany({
        where: { user: { role: 'SELLER' } },
        skip,
        take: limit,
        include: {
          user: { select: { email: true, name: true, avatar: true, phone: true, address: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({
        where: { user: { role: 'SELLER' } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: sellers.map((seller) => ({
        id: seller.id,
        userId: seller.userId,
        name: seller.user.name,
        email: seller.user.email,
        phone: seller.user.phone || '',
        address: seller.user.address || '',
        avatar: seller.user.avatar || '',
        status: seller.status,
        employeeCode: seller.employeeCode,
        salesTargetAmount: seller.salesTargetAmount,
        monthlyExpensesAmount: seller.monthlyExpensesAmount,
        createdAt: seller.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sellers' },
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
    const { id, status, phone, address, designation, salesTargetAmount, monthlyExpensesAmount } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Seller ID required' },
        { status: 400 }
      );
    }

    // Get employee to find userId
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Update employee and user separately
    const updates: any = {};
    const userUpdates: any = {};

    if (status !== undefined) {
      updates.status = typeof status === 'boolean' ? status : status === 'true' || status === '1';
    }
    if (phone !== undefined) {
      userUpdates.phone = phone;
    }
    if (address !== undefined) {
      userUpdates.address = address;
    }
    if (designation !== undefined) {
      updates.designation = designation;
    }
    if (salesTargetAmount !== undefined) {
      updates.salesTargetAmount = normalizeSalesTargetCount(salesTargetAmount);
    }
    if (monthlyExpensesAmount !== undefined) {
      updates.monthlyExpensesAmount = Number(monthlyExpensesAmount) || 0;
    }

    // Update employee
    if (Object.keys(updates).length > 0) {
      await prisma.employee.update({
        where: { id },
        data: updates,
      });
    }

    // Update user if needed
    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: userUpdates,
      });
    }

    // Fetch updated seller
    const updatedSeller = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true, avatar: true, phone: true, address: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedSeller.id,
        userId: updatedSeller.userId,
        name: updatedSeller.user.name,
        email: updatedSeller.user.email,
        phone: updatedSeller.user.phone || '',
        address: updatedSeller.user.address || '',
        avatar: updatedSeller.user.avatar || '',
        status: updatedSeller.status,
        employeeCode: updatedSeller.employeeCode,
        salesTargetAmount: updatedSeller.salesTargetAmount,
        monthlyExpensesAmount: updatedSeller.monthlyExpensesAmount,
      },
    });
  } catch (error) {
    console.error('Error updating seller:', error);
    return NextResponse.json(
      { error: 'Failed to update seller' },
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

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Seller ID required' },
        { status: 400 }
      );
    }

    // Deactivate seller instead of deleting (set status to false)
    await prisma.employee.update({
      where: { id },
      data: { status: false },
    });

    return NextResponse.json({ success: true, message: 'Seller deactivated' });
  } catch (error) {
    console.error('Error deactivating seller:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate seller' },
      { status: 500 }
    );
  }
}

