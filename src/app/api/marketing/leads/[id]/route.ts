import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  stage: z.enum(['LEAD', 'TRANSFERRED', 'CONFIRMED', 'DONE', 'CANCELLED']),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'MARKETING') {
      return NextResponse.json({ success: false, error: 'Only marketing can update leads' }, { status: 403 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: { stage: data.stage },
    });

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Lead update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
