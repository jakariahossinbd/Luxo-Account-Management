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
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    const where: any = {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (userId) {
      where.userId = userId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.date = { gte: startOfDay, lt: endOfDay };
    }

    const users = await prisma.user.findMany({
      where: { role: { in: ['SELLER', 'MARKETING'] }, status: 'ACTIVE' },
      include: {
        employee: true,
        attendances: {
          where: where.date ? { date: where.date } : undefined,
          orderBy: { date: 'desc' },
          take: 30,
        },
        activities: {
          where: {
            activity: 'ATTENDANCE_VERIFICATION',
            date: { gte: todayStart, lt: tomorrow },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const stats = {
      totalStaff: users.length,
      checkedIn: users.filter(u => u.attendances[0]?.status === 'CHECKED_IN').length,
      onBreak: users.filter(u => u.attendances[0]?.status === 'ON_BREAK').length,
      checkedOut: users.filter(u => u.attendances[0]?.status === 'CHECKED_OUT').length,
    };

    return NextResponse.json({ success: true, data: { staff: users, stats } });
  } catch (error) {
    console.error('Admin staff GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}