import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ClockWindow = {
  clockInStart: string;
  clockInEnd: string;
  clockOutStart: string;
  clockOutEnd: string;
};

type LocationPolicy = {
  officeLatitude: number;
  officeLongitude: number;
  allowedRadiusMeters: number;
  requireLocation: boolean;
  requireSelfie: boolean;
};

type VerificationPayload = {
  selfieVerified?: boolean;
  location?: {
    lat?: number;
    lng?: number;
  };
};

const CLOCK_WINDOW_KEY = 'attendance.clock_window';
const LOCATION_POLICY_KEY = 'attendance.location_policy';
const VERIFICATION_ACTIVITY = 'ATTENDANCE_VERIFICATION';
const DEFAULT_CLOCK_WINDOW: ClockWindow = {
  clockInStart: '08:00',
  clockInEnd: '11:00',
  clockOutStart: '16:00',
  clockOutEnd: '23:00',
};

const DEFAULT_LOCATION_POLICY: LocationPolicy = {
  officeLatitude: 23.8103,
  officeLongitude: 90.4125,
  allowedRadiusMeters: 250,
  requireLocation: true,
  requireSelfie: true,
};

function parseClockWindow(raw: string | null | undefined): ClockWindow {
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

function parseLocationPolicy(raw: string | null | undefined): LocationPolicy {
  if (!raw) return DEFAULT_LOCATION_POLICY;
  try {
    const parsed = JSON.parse(raw) as Partial<LocationPolicy>;
    return {
      officeLatitude: Number.isFinite(parsed.officeLatitude) ? Number(parsed.officeLatitude) : DEFAULT_LOCATION_POLICY.officeLatitude,
      officeLongitude: Number.isFinite(parsed.officeLongitude) ? Number(parsed.officeLongitude) : DEFAULT_LOCATION_POLICY.officeLongitude,
      allowedRadiusMeters: Number.isFinite(parsed.allowedRadiusMeters) ? Number(parsed.allowedRadiusMeters) : DEFAULT_LOCATION_POLICY.allowedRadiusMeters,
      requireLocation: typeof parsed.requireLocation === 'boolean' ? parsed.requireLocation : DEFAULT_LOCATION_POLICY.requireLocation,
      requireSelfie: typeof parsed.requireSelfie === 'boolean' ? parsed.requireSelfie : DEFAULT_LOCATION_POLICY.requireSelfie,
    };
  } catch {
    return DEFAULT_LOCATION_POLICY;
  }
}

async function getClockWindow(): Promise<ClockWindow> {
  const setting = await prisma.setting.findUnique({ where: { key: CLOCK_WINDOW_KEY } });
  return parseClockWindow(setting?.value);
}

async function getLocationPolicy(): Promise<LocationPolicy> {
  const setting = await prisma.setting.findUnique({ where: { key: LOCATION_POLICY_KEY } });
  return parseLocationPolicy(setting?.value);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function logVerificationAttempt(userId: string, data: Record<string, unknown>) {
  await prisma.dailyActivity.create({
    data: {
      userId,
      date: new Date(),
      activity: VERIFICATION_ACTIVITY,
      status: String(data.status || 'PENDING'),
      notes: JSON.stringify(data),
    },
  });
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isWithinWindow(nowMinutes: number, start: string, end: string): boolean {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes <= endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const [attendance, monthAttendances, holidays, clockWindow, locationPolicy, employee, salary] = await Promise.all([
      prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: today, lt: tomorrow },
        },
      }),
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
      getClockWindow(),
      getLocationPolicy(),
      prisma.employee.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
      prisma.salary.findUnique({
        where: { userId_month_year: { userId: session.user.id, month, year } },
        select: { netSalary: true },
      }),
    ]);

    const holidayDateKeys = holidays.map((h) => formatDateKey(h.date));
    const attendanceDateKeys = new Set(monthAttendances.map((a) => formatDateKey(a.date)));

    const daysInMonth = new Date(year, month, 0).getDate();
    const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
    const activeDays = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    let presentCount = 0;
    let absentCount = 0;
    for (let day = 1; day <= activeDays; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (holidayDateKeys.includes(dateKey)) {
        continue;
      }
      if (attendanceDateKeys.has(dateKey)) {
        presentCount += 1;
      } else {
        absentCount += 1;
      }
    }

    const totalHours = monthAttendances.reduce((sum, item) => sum + (item.totalHours || 0), 0);
    const avgHours = monthAttendances.length ? Math.round((totalHours / monthAttendances.length) * 10) / 10 : 0;

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
        date: formatDateKey(dayStart),
        status: dayAttendance?.status || 'ABSENT',
        hours: dayAttendance?.totalHours || 0,
      });
    }

    let todayEarning = 0;
    if (employee?.id) {
      const salesSummary = await prisma.sale.aggregate({
        where: {
          employeeId: employee.id,
          createdAt: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
        _sum: { total: true },
      });
      todayEarning = Math.round(salesSummary._sum.total || 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        today: attendance || null,
        last7Days,
        monthRecords: monthAttendances.map((item) => ({
          id: item.id,
          date: formatDateKey(item.date),
          status: item.status,
          checkInTime: item.checkInTime,
          checkOutTime: item.checkOutTime,
          totalHours: item.totalHours,
        })),
        holidays: holidayDateKeys,
        salary: {
          monthly: Math.round(salary?.netSalary || 0),
        },
        todayEarning,
        clockWindow,
        locationPolicy,
        summary: {
          presentCount,
          absentCount,
        },
        monthlyStats: {
          daysWorked: monthAttendances.length,
          avgHours,
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

    const body = await request.json();
    const action = body?.action;
    const verification: VerificationPayload | undefined = body?.verification;
    const [clockWindow, locationPolicy] = await Promise.all([getClockWindow(), getLocationPolicy()]);
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
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (action === 'checkIn') {
      if (attendance?.checkInTime) {
        return NextResponse.json({ success: false, error: 'Already checked in' }, { status: 400 });
      }
      if (!isWithinWindow(nowMinutes, clockWindow.clockInStart, clockWindow.clockInEnd)) {
        return NextResponse.json(
          {
            success: false,
            error: `Clock In is allowed between ${clockWindow.clockInStart} and ${clockWindow.clockInEnd}`,
          },
          { status: 400 }
        );
      }

      if (locationPolicy.requireSelfie && !verification?.selfieVerified) {
        await logVerificationAttempt(session.user.id, {
          status: 'FAILED',
          reason: 'SELFIE_NOT_VERIFIED',
        });
        return NextResponse.json({ success: false, error: 'Selfie/Liveness verification is required for Clock In' }, { status: 400 });
      }

      if (locationPolicy.requireLocation) {
        const lat = Number(verification?.location?.lat);
        const lng = Number(verification?.location?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          await logVerificationAttempt(session.user.id, {
            status: 'FAILED',
            reason: 'LOCATION_NOT_PROVIDED',
          });
          return NextResponse.json({ success: false, error: 'Office location verification is required for Clock In' }, { status: 400 });
        }

        const distance = distanceMeters(lat, lng, locationPolicy.officeLatitude, locationPolicy.officeLongitude);
        if (distance > locationPolicy.allowedRadiusMeters) {
          await logVerificationAttempt(session.user.id, {
            status: 'FAILED',
            reason: 'OUTSIDE_GEOFENCE',
            distanceMeters: Math.round(distance),
            allowedRadiusMeters: locationPolicy.allowedRadiusMeters,
            userLocation: { lat, lng },
          });
          return NextResponse.json(
            {
              success: false,
              error: `You are outside the allowed office radius (${locationPolicy.allowedRadiusMeters}m)`,
            },
            { status: 400 }
          );
        }
      }

      attendance = attendance
        ? await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
              checkInTime: now,
              status: 'CHECKED_IN',
            },
          })
        : await prisma.attendance.create({
            data: {
              userId: session.user.id,
              date: today,
              checkInTime: now,
              status: 'CHECKED_IN',
            },
          });

      await logVerificationAttempt(session.user.id, {
        status: 'VERIFIED',
        reason: 'CLOCK_IN_ALLOWED',
        selfieVerified: Boolean(verification?.selfieVerified),
        location: verification?.location || null,
        policy: {
          officeLatitude: locationPolicy.officeLatitude,
          officeLongitude: locationPolicy.officeLongitude,
          allowedRadiusMeters: locationPolicy.allowedRadiusMeters,
        },
      });
    } else if (action === 'checkOut') {
      if (!attendance?.checkInTime) {
        return NextResponse.json({ success: false, error: 'Not checked in' }, { status: 400 });
      }
      if (attendance?.checkOutTime) {
        return NextResponse.json({ success: false, error: 'Already checked out' }, { status: 400 });
      }
      if (!isWithinWindow(nowMinutes, clockWindow.clockOutStart, clockWindow.clockOutEnd)) {
        return NextResponse.json(
          {
            success: false,
            error: `Clock Out is allowed between ${clockWindow.clockOutStart} and ${clockWindow.clockOutEnd}`,
          },
          { status: 400 }
        );
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

    return NextResponse.json({ success: true, data: attendance, clockWindow, locationPolicy });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}