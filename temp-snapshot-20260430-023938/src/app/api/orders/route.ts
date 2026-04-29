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

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const orders = await prisma.lead.findMany({
      where: { createdById: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        leadId: true,
        customerName: true,
        phone: true,
        notes: true,
        stage: true,
        quantity: true,
        productNote: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
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
    const { customerName, phone, notes, quantity, productNote } = body;

    if (!customerName || !phone) {
      return NextResponse.json({ success: false, error: 'Customer name and phone are required' }, { status: 400 });
    }

    const leadId = 'LEAD-' + Date.now().toString(36).toUpperCase();

    const lead = await prisma.lead.create({
      data: {
        leadId,
        customerName,
        phone,
        notes: notes || '',
        quantity: quantity || null,
        productNote: productNote || '',
        createdById: session.user.id,
        stage: 'LEAD',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        leadId: lead.leadId,
        customerName: lead.customerName,
        phone: lead.phone,
        notes: lead.notes,
        stage: lead.stage,
        createdAt: lead.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, stage } = body;

    if (!id || !stage) {
      return NextResponse.json({ success: false, error: 'ID and stage are required' }, { status: 400 });
    }

    if (stage !== 'LEAD' && stage !== 'TRANSFERRED') {
      return NextResponse.json({ success: false, error: 'Invalid stage' }, { status: 400 });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { stage },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        leadId: lead.leadId,
        stage: lead.stage,
      },
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
