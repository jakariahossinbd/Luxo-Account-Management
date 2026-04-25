import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type CsvRow = {
  date: string;
  status: string;
  checkInTime: string;
  checkOutTime: string;
  totalHours: string;
  note: string;
};

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: Date | null): string {
  if (!value) return '';
  return value.toLocaleTimeString('en-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: CsvRow[]): string {
  const header = ['Date', 'Status', 'Check In', 'Check Out', 'Total Hours', 'Note'];
  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push([
      row.date,
      row.status,
      row.checkInTime,
      row.checkOutTime,
      row.totalHours,
      row.note,
    ].map(escapeCsv).join(','));
  }

  return lines.join('\n');
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

    const month = selectedMonth >= 1 && selectedMonth <= 12 ? selectedMonth : now.getMonth() + 1;
    const year = selectedYear >= 2000 && selectedYear <= 2100 ? selectedYear : now.getFullYear();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const [attendances, holidays] = await Promise.all([
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
    ]);

    const attendanceMap = new Map(attendances.map((item) => [formatDateKey(item.date), item]));
    const holidayKeys = new Set(holidays.map((item) => formatDateKey(item.date)));
    const totalDays = new Date(year, month, 0).getDate();

    const rows: CsvRow[] = [];
    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendance = attendanceMap.get(dateKey);
      const isHoliday = holidayKeys.has(dateKey);

      rows.push({
        date: dateKey,
        status: attendance?.status || (isHoliday ? 'HOLIDAY' : 'ABSENT'),
        checkInTime: formatTime(attendance?.checkInTime ?? null),
        checkOutTime: formatTime(attendance?.checkOutTime ?? null),
        totalHours: attendance?.totalHours ? String(attendance.totalHours) : '',
        note: isHoliday ? 'Holiday' : '',
      });
    }

    const csv = toCsv(rows);
    const fileName = `seller-attendance-${year}-${String(month).padStart(2, '0')}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Attendance export error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
