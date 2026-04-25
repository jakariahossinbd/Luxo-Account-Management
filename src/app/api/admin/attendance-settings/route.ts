import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
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

const CLOCK_WINDOW_KEY = 'attendance.clock_window';
const LOCATION_POLICY_KEY = 'attendance.location_policy';
const DEFAULT_CLOCK_WINDOW: ClockWindow = {
  clockInStart: '00:00',
  clockInEnd: '23:59',
  clockOutStart: '00:00',
  clockOutEnd: '23:59',
};

const DEFAULT_LOCATION_POLICY: LocationPolicy = {
  officeLatitude: 23.9287696,
  officeLongitude: 90.3778525,
  allowedRadiusMeters: 100,
  requireLocation: true,
  requireSelfie: true,
};

const clockWindowSchema = z.object({
  clockInStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  clockInEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  clockOutStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  clockOutEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

const locationPolicySchema = z.object({
  officeLatitude: z.number().min(-90).max(90),
  officeLongitude: z.number().min(-180).max(180),
  allowedRadiusMeters: z.number().min(10).max(10000),
  requireLocation: z.boolean(),
  requireSelfie: z.boolean(),
});

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

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [clockSetting, locationSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: CLOCK_WINDOW_KEY } }),
      prisma.setting.findUnique({ where: { key: LOCATION_POLICY_KEY } }),
    ]);

    const clockWindow = parseClockWindow(clockSetting?.value);
    const locationPolicy = parseLocationPolicy(locationSetting?.value);

    return NextResponse.json({ success: true, data: { ...clockWindow, ...locationPolicy } });
  } catch (error) {
    console.error('Admin attendance settings GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedClockWindow = clockWindowSchema.parse(body);
    const parsedLocationPolicy = locationPolicySchema.parse({
      officeLatitude: Number(body.officeLatitude ?? DEFAULT_LOCATION_POLICY.officeLatitude),
      officeLongitude: Number(body.officeLongitude ?? DEFAULT_LOCATION_POLICY.officeLongitude),
      allowedRadiusMeters: Number(body.allowedRadiusMeters ?? DEFAULT_LOCATION_POLICY.allowedRadiusMeters),
      requireLocation: typeof body.requireLocation === 'boolean' ? body.requireLocation : DEFAULT_LOCATION_POLICY.requireLocation,
      requireSelfie: typeof body.requireSelfie === 'boolean' ? body.requireSelfie : DEFAULT_LOCATION_POLICY.requireSelfie,
    });

    await prisma.$transaction([
      prisma.setting.upsert({
        where: { key: CLOCK_WINDOW_KEY },
        update: { value: JSON.stringify(parsedClockWindow) },
        create: {
          key: CLOCK_WINDOW_KEY,
          value: JSON.stringify(parsedClockWindow),
        },
      }),
      prisma.setting.upsert({
        where: { key: LOCATION_POLICY_KEY },
        update: { value: JSON.stringify(parsedLocationPolicy) },
        create: {
          key: LOCATION_POLICY_KEY,
          value: JSON.stringify(parsedLocationPolicy),
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: { ...parsedClockWindow, ...parsedLocationPolicy } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid attendance settings format' }, { status: 400 });
    }
    console.error('Admin attendance settings PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
