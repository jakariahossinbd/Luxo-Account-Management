import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const leaveSchema = z.object({
  leaveType: z.enum(['SICK', 'CASUAL', 'EMERGENCY', 'VACATION', 'OTHER']).default('CASUAL'),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(1, 'Reason is required'),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const pending = leaves.filter(l => l.status === 'PENDING').length;
    const approved = leaves.filter(l => l.status === 'APPROVED').length;
    const rejected = leaves.filter(l => l.status === 'REJECTED').length;

    return NextResponse.json({
      success: true,
      data: {
        leaves,
        stats: { pending, approved, rejected },
      },
    });
  } catch (error) {
    console.error('Leave GET error:', error);
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
    const data = leaveSchema.parse(body);

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await prisma.leaveRequest.create({
      data: {
        userId: session.user.id,
        leaveType: data.leaveType,
        startDate,
        endDate,
        days,
        reason: data.reason,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, data: leave });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Leave POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}