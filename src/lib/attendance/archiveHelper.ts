import { prisma } from '@/lib/prisma';
import { generateAttendanceXlsx, AttendanceRow, AttendanceStats } from '@/lib/excel/attendanceXlsx';

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForDisplay(date: Date | null): string {
  if (!date) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export async function archiveMonthlyAttendance(userId: string, month: number, year: number) {
  try {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const [attendances, holidays, user] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          userId,
          date: { gte: monthStart, lt: monthEnd },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
        select: { date: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    const attendanceMap = new Map(attendances.map((item) => [formatDateKey(item.date), item]));
    const holidayKeys = new Set(holidays.map((item) => formatDateKey(item.date)));
    const totalDays = new Date(year, month, 0).getDate();

    const rows: AttendanceRow[] = [];
    const stats: AttendanceStats = {
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      holidayCount: 0,
      totalWorkingHours: 0,
    };

    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendance = attendanceMap.get(dateKey);
      const isHoliday = holidayKeys.has(dateKey);

      let status = 'ABSENT';
      if (isHoliday) {
        status = 'HOLIDAY';
        stats.holidayCount += 1;
      } else if (attendance) {
        status = attendance.status === 'CHECKED_IN' || attendance.status === 'CHECKED_OUT' ? 'PRESENT' : 'LATE';
        if (status === 'PRESENT') stats.presentCount += 1;
        if (status === 'LATE') stats.lateCount += 1;
        stats.totalWorkingHours += attendance.totalHours || 0;
      } else {
        stats.absentCount += 1;
      }

      rows.push({
        date: dateKey,
        status,
        checkInTime: formatTimeForDisplay(attendance?.checkInTime ?? null),
        checkOutTime: formatTimeForDisplay(attendance?.checkOutTime ?? null),
        totalHours: attendance?.totalHours ? String(attendance.totalHours.toFixed(2)) : '',
      });
    }

    // Generate XLSX
    const sellerId = user.id.substring(0, 8).toUpperCase();
    const sellerName = user.name || 'Unknown';
    const xlsxBuffer = await generateAttendanceXlsx(
      sellerId,
      sellerName,
      month,
      year,
      rows,
      stats
    );

    const fileName = `seller-attendance-${year}-${String(month).padStart(2, '0')}.xlsx`;

    // Save to database
    await prisma.archivedAttendance.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      update: {
        fileBuffer: xlsxBuffer,
        fileName,
        archivedAt: new Date(),
      },
      create: {
        userId,
        month,
        year,
        fileBuffer: xlsxBuffer,
        fileName,
      },
    });

    console.log(`Archived attendance for user ${userId}, month ${month}/${year}`);
    return true;
  } catch (error) {
    console.error(`Error archiving attendance for user ${userId}:`, error);
    return false;
  }
}
