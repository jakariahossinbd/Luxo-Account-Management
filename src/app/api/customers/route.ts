import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function generateCustomerId(): string {
  return 'CUS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        totalDue: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, note } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and phone are required' }, { status: 400 });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { phone },
    });

    if (existingCustomer) {
      return NextResponse.json({ success: false, error: 'Customer with this phone already exists' }, { status: 409 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        address: note || '',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        customerId: generateCustomerId(),
        name: customer.name,
        phone: customer.phone,
        note: customer.address,
        createdAt: customer.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
