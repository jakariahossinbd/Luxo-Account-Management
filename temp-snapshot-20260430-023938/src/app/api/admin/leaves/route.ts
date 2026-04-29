import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { user: { include: { employee: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const pending = await prisma.leaveRequest.count({ where: { status: 'PENDING' } });
    const approved = await prisma.leaveRequest.count({ where: { status: 'APPROVED' } });
    const rejected = await prisma.leaveRequest.count({ where: { status: 'REJECTED' } });

    return NextResponse.json({
      success: true,
      data: {
        leaves,
        stats: { pending, approved, rejected },
      },
    });
  } catch (error) {
    console.error('Admin leaves GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status, notes } = await request.json();

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status.toUpperCase(),
        approvedBy: session.user.id,
        approvedAt: status === 'APPROVED' || status === 'REJECTED' ? new Date() : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: leave });
  } catch (error) {
    console.error('Admin leaves PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}