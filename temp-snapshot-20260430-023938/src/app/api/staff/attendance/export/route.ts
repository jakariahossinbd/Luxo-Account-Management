import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAttendanceXlsx, AttendanceRow, AttendanceStats } from '@/lib/excel/attendanceXlsx';
import { buildMonthlyAttendanceDataset, ClockWindow } from '@/lib/attendance/monthlyAttendance';

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inferVerificationMethod(notes: string | null): string | undefined {
  if (!notes) return undefined;
  try {
    const parsed = JSON.parse(notes) as { selfieVerified?: boolean; locationVerified?: boolean };
    if (parsed.locationVerified) return 'Location';
    if (parsed.selfieVerified) return 'Liveness';
    return undefined;
  } catch {
    return undefined;
  }
}

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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const selectedMonth = Number(searchParams.get('month') || now.getMonth() + 1);
    const selectedYear = Number(searchParams.get('year') || now.getFullYear());
    const format = searchParams.get('format') || 'xlsx'; // Default to XLSX

    const month = selectedMonth >= 1 && selectedMonth <= 12 ? selectedMonth : now.getMonth() + 1;
    const year = selectedYear >= 2000 && selectedYear <= 2100 ? selectedYear : now.getFullYear();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    // Check if requesting archived data (past months)
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    // Try to get archived version first (if not current month or if format=archived explicitly)
    if (!isCurrentMonth) {
      const archived = await prisma.archivedAttendance.findUnique({
        where: {
          userId_month_year: {
            userId: session.user.id,
            month,
            year,
          },
        },
      });

      if (archived) {
        const fileName = `seller-attendance-${year}-${String(month).padStart(2, '0')}.xlsx`;
        return new NextResponse(archived.fileBuffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
          },
        });
      }
    }

    // Fetch live attendance data for the month
    const [attendances, holidays, verificationActivities, user, clockWindowSetting] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          userId: session.user.id,
          date: { gte: monthStart, lt: monthEnd },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
        select: { date: true },
      }),
      prisma.dailyActivity.findMany({
        where: {
          userId: session.user.id,
          activity: 'ATTENDANCE_VERIFICATION',
          date: { gte: monthStart, lt: monthEnd },
        },
        select: {
          date: true,
          notes: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true },
      }),
      prisma.setting.findUnique({
        where: { key: 'attendance.clock_window' },
      }),
    ]);

    const verificationMethodsByDate = new Map<string, string>();
    for (const activity of verificationActivities) {
      const dateKey = formatDateKey(activity.date);
      if (!verificationMethodsByDate.has(dateKey)) {
        const method = inferVerificationMethod(activity.notes);
        if (method) {
          verificationMethodsByDate.set(dateKey, method);
        }
      }
    }

    // Add Fridays as holidays (weekly holiday)
    const allHolidays = [...holidays];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month - 1, day);
      if (date.getDay() === 5) { // Friday is 5
        const dateKey = formatDateKey(date);
        // Check if already in holidays
        if (!allHolidays.some((h) => formatDateKey(h.date) === dateKey)) {
          allHolidays.push({ date });
        }
      }
    }

    const activeDays = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
    const clockWindow = parseClockWindow(clockWindowSetting?.value);

    const { rows, stats } = buildMonthlyAttendanceDataset({
      attendances,
      holidays: allHolidays,
      verificationMethodsByDate,
      year,
      month,
      daysInScope: activeDays,
      clockWindow,
    });

    // Generate XLSX
    const sellerId = user?.id?.substring(0, 8).toUpperCase() || 'UNKNOWN';
    const sellerName = user?.name || 'Unknown';
    const xlsxBuffer = await generateAttendanceXlsx(
      sellerId,
      sellerName,
      month,
      year,
      rows,
      stats
    );

    const fileName = `seller-attendance-${year}-${String(month).padStart(2, '0')}.xlsx`;

    return new NextResponse(xlsxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Attendance export error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
