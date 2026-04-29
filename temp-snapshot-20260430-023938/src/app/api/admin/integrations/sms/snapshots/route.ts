import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { createMonthlySnapshot, listMonthlySnapshots } from '@/lib/integrations/smsSnapshots';
import { LeadSmsStatus } from '@/lib/integrations/smsRecipients';

const statusEnum = z.enum(['customer-leds', 'pending', 'processing', 'delivery', 'canceled']);

const snapshotCreateSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  statuses: z.array(statusEnum).min(1),
});

const snapshotQuerySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  statuses: z.array(statusEnum).optional(),
});

const DEFAULT_STATUSES: LeadSmsStatus[] = ['customer-leds', 'pending', 'processing', 'delivery', 'canceled'];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null;
  }
  return session;
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStatuses(raw: string | null): LeadSmsStatus[] | undefined {
  if (!raw) return undefined;

  const values = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is LeadSmsStatus =>
      entry === 'customer-leds' ||
      entry === 'pending' ||
      entry === 'processing' ||
      entry === 'delivery' ||
      entry === 'canceled'
    );

  return values.length > 0 ? values : undefined;
}

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = snapshotQuerySchema.parse({
      year: parsePositiveInt(url.searchParams.get('year')),
      month: parsePositiveInt(url.searchParams.get('month')),
      statuses: parseStatuses(url.searchParams.get('statuses')),
    });

    const snapshotRows = await listMonthlySnapshots({
      year: parsed.year,
      month: parsed.month,
      statuses: parsed.statuses || DEFAULT_STATUSES,
    });

    return NextResponse.json({
      success: true,
      data: {
        year: parsed.year,
        month: parsed.month,
        snapshots: snapshotRows,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid snapshot query format' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = snapshotCreateSchema.parse({
      year: Number(body.year),
      month: Number(body.month),
      statuses: Array.isArray(body.statuses) ? body.statuses : [],
    });

    const snapshots = await createMonthlySnapshot(parsed);

    return NextResponse.json({
      success: true,
      data: {
        year: parsed.year,
        month: parsed.month,
        snapshots: snapshots.map((item) => ({
          status: item.status,
          total: item.total,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid snapshot payload format' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
