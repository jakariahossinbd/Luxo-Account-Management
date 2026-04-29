import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        avatar: true,
        phone: true,
        address: true,
      },
    });

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        employeeCode: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: session.user.id,
        name: user.name || 'Seller',
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        image: user.avatar || '',
        sellerId: employee?.employeeCode || employee?.id || session.user.id,
        employeeCode: employee?.employeeCode || '',
        // Keep safe defaults until DB/client is aligned with extended employee fields.
        salesTargetAmount: 0,
        monthlyExpensesAmount: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
