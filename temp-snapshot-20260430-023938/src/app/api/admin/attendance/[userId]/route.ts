import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { archiveMonthlyAttendance } from '@/lib/attendance/archiveHelper';

export async function POST(request: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = params;
    const { date, status, checkInTime, checkOutTime, totalHours, action } = await request.json();

    if (action === 'update') {
      // Update or create attendance record
      const parsedDate = new Date(date);
      parsedDate.setHours(0, 0, 0, 0);

      let checkInDateTime: Date | null = null;
      let checkOutDateTime: Date | null = null;

      if (checkInTime) {
        const [hours, minutes] = checkInTime.split(':').map(Number);
        checkInDateTime = new Date(parsedDate);
        checkInDateTime.setHours(hours, minutes, 0);
      }

      if (checkOutTime) {
        const [hours, minutes] = checkOutTime.split(':').map(Number);
        checkOutDateTime = new Date(parsedDate);
        checkOutDateTime.setHours(hours, minutes, 0);
      }

      const attendance = await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId,
            date: parsedDate,
          },
        },
        update: {
          status: status || 'CHECKED_IN',
          checkInTime: checkInDateTime,
          checkOutTime: checkOutDateTime,
          totalHours: totalHours || 0,
        },
        create: {
          userId,
          date: parsedDate,
          status: status || 'CHECKED_IN',
          checkInTime: checkInDateTime,
          checkOutTime: checkOutDateTime,
          totalHours: totalHours || 0,
        },
      });

      // Re-archive the month if it's a past month
      const now = new Date();
      const month = parsedDate.getMonth() + 1;
      const year = parsedDate.getFullYear();
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

      if (!isCurrentMonth) {
        await archiveMonthlyAttendance(userId, month, year);
      }

      return NextResponse.json({ success: true, data: attendance });
    }

    if (action === 'delete') {
      // Delete attendance record
      const parsedDate = new Date(date);
      parsedDate.setHours(0, 0, 0, 0);

      await prisma.attendance.deleteMany({
        where: {
          userId,
          date: parsedDate,
        },
      });

      // Re-archive the month
      const month = parsedDate.getMonth() + 1;
      const year = parsedDate.getFullYear();
      await archiveMonthlyAttendance(userId, month, year);

      return NextResponse.json({ success: true, message: 'Attendance record deleted' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin attendance update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
