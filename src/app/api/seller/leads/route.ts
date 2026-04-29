import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const leadSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().min(1),
  notes: z.string().optional(),
  quantity: z.number().optional(),
  productNote: z.string().optional(),
});

function generateLeadId(): string {
  const date = new Date();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${random}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      where: { createdById: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    console.error('Leads GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SELLER') {
      return NextResponse.json({ success: false, error: 'Only sellers can create leads' }, { status: 403 });
    }

    const body = await request.json();
    const data = leadSchema.parse(body);

    const leadId = generateLeadId();

    const lead = await prisma.lead.create({
      data: {
        leadId,
        customerName: data.customerName,
        phone: data.phone,
        notes: data.notes,
        quantity: data.quantity || 0,
        productNote: data.productNote,
        createdById: session.user.id,
        stage: 'LEAD',
      },
    });

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Leads POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
