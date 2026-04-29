import { prisma } from '@/lib/prisma';
import { generateAttendanceXlsx, AttendanceRow, AttendanceStats } from '@/lib/excel/attendanceXlsx';
import { buildMonthlyAttendanceDataset, ClockWindow } from '@/lib/attendance/monthlyAttendance';

function parseClockWindow(raw: string | null | undefined): ClockWindow {
  const DEFAULT_CLOCK_WINDOW: ClockWindow = {
    clockInStart: '00:00',
    clockInEnd: '23:59',
    clockOutStart: '00:00',
    clockOutEnd: '23:59',
  };
  if (!raw) return DEFAULT_CLOCK_WINDOW;
  try {
    const parsed = JSON.parse(raw) as Partial<ClockWindow>;
    if (!parsed.clockInStart || !parsed.clockInEnd || !parsed.clockOutStart || !parsed.clockOutEnd) {
      return DEFAULT_CLOCK_WINDOW;
    }
    return {
      clockInStart: parsed.clockInStart,
      clockInEnd: parsed.clockInEnd,
      clockOutStart: parsed.clockOutStart,
      clockOutEnd: parsed.clockOutEnd,
    };
  } catch {
    return DEFAULT_CLOCK_WINDOW;
  }
}

export async function archiveMonthlyAttendance(userId: string, month: number, year: number) {
  try {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const [attendances, holidays, user, clockWindowSetting, verificationActivities] = await Promise.all([
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
      prisma.setting.findUnique({
        where: { key: 'attendance.clock_window' },
      }),
      prisma.dailyActivity.findMany({
        where: {
          userId,
          activity: 'ATTENDANCE_VERIFICATION',
          date: { gte: monthStart, lt: monthEnd },
        },
        select: {
          date: true,
          notes: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    const verificationMethodsByDate = new Map<string, string>();
    for (const activity of verificationActivities) {
      const dateKey = `${activity.date.getFullYear()}-${String(activity.date.getMonth() + 1).padStart(2, '0')}-${String(activity.date.getDate()).padStart(2, '0')}`;
      if (!verificationMethodsByDate.has(dateKey)) {
        try {
          const parsed = JSON.parse(activity.notes) as { selfieVerified?: boolean; locationVerified?: boolean };
          if (parsed.locationVerified) verificationMethodsByDate.set(dateKey, 'Location');
          else if (parsed.selfieVerified) verificationMethodsByDate.set(dateKey, 'Liveness');
        } catch {
          // ignore parse errors
        }
      }
    }

    const totalDays = new Date(year, month, 0).getDate();
    const clockWindow = parseClockWindow(clockWindowSetting?.value);

    const { rows, stats } = buildMonthlyAttendanceDataset({
      attendances,
      holidays,
          // Add Fridays as holidays (weekly holiday)
          const allHolidays = [...holidays];
          for (let day = 1; day <= totalDays; day += 1) {
            const date = new Date(year, month - 1, day);
            if (date.getDay() === 5) { // Friday is 5
              const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              // Check if already in holidays
              if (!allHolidays.some((h) => {
                const hKey = `${h.date.getFullYear()}-${String(h.date.getMonth() + 1).padStart(2, '0')}-${String(h.date.getDate()).padStart(2, '0')}`;
                return hKey === dateKey;
              })) {
                allHolidays.push({ date });
              }
            }
          }

          const { rows, stats } = buildMonthlyAttendanceDataset({
            attendances,
            holidays: allHolidays,
      verificationMethodsByDate,
      year,
      month,
      daysInScope: totalDays,
      clockWindow,
    });

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
