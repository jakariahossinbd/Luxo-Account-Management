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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: { gte: today, lt: tomorrow },
      },
    });

    const last7Days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayAttendance = await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: dayStart, lt: dayEnd },
        },
      });
      last7Days.push({
        date: dayStart.toISOString().split('T')[0],
        status: dayAttendance?.status || 'ABSENT',
        hours: dayAttendance?.totalHours || 0,
      });
    }

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await prisma.attendance.aggregate({
      where: {
        userId: session.user.id,
        date: { gte: thisMonth },
      },
      _avg: { totalHours: true },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        today: attendance || null,
        last7Days,
        monthlyStats: {
          daysWorked: monthlyStats._count,
          avgHours: Math.round(monthlyStats._avg.totalHours || 0),
        },
      },
    });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: { gte: today, lt: tomorrow },
      },
    });

    const now = new Date();

    if (action === 'checkIn') {
      if (attendance?.checkInTime) {
        return NextResponse.json({ success: false, error: 'Already checked in' }, { status: 400 });
      }
      attendance = await prisma.attendance.upsert({
        where: { id: attendance?.id || '' },
        create: {
          userId: session.user.id,
          date: today,
          checkInTime: now,
          status: 'CHECKED_IN',
        },
        update: {
          checkInTime: now,
          status: 'CHECKED_IN',
        },
      });
    } else if (action === 'checkOut') {
      if (!attendance?.checkInTime) {
        return NextResponse.json({ success: false, error: 'Not checked in' }, { status: 400 });
      }
      if (attendance?.checkOutTime) {
        return NextResponse.json({ success: false, error: 'Already checked out' }, { status: 400 });
      }
      const hours = (now.getTime() - attendance.checkInTime.getTime()) / (1000 * 60 * 60);
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: now,
          totalHours: Math.round(hours * 10) / 10,
          status: 'CHECKED_OUT',
        },
      });
    } else if (action === 'breakStart') {
      if (!attendance?.checkInTime || attendance?.breakStart) {
        return NextResponse.json({ success: false, error: 'Cannot start break' }, { status: 400 });
      }
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          breakStart: now,
          status: 'ON_BREAK',
        },
      });
    } else if (action === 'breakEnd') {
      if (!attendance?.breakStart || attendance?.breakEnd) {
        return NextResponse.json({ success: false, error: 'No active break' }, { status: 400 });
      }
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          breakEnd: now,
          status: 'CHECKED_IN',
        },
      });
    } else if (action === 'lunchStart') {
      if (!attendance?.checkInTime || attendance?.lunchStart) {
        return NextResponse.json({ success: false, error: 'Cannot start lunch' }, { status: 400 });
      }
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          lunchStart: now,
          status: 'ON_BREAK',
        },
      });
    } else if (action === 'lunchEnd') {
      if (!attendance?.lunchStart || attendance?.lunchEnd) {
        return NextResponse.json({ success: false, error: 'No active lunch' }, { status: 400 });
      }
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          lunchEnd: now,
          status: 'CHECKED_IN',
        },
      });
    }

    return NextResponse.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}