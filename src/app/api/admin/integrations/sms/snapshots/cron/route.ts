import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createMonthlySnapshot } from '@/lib/integrations/smsSnapshots';

const statusEnum = z.enum(['customer-leds', 'pending', 'processing', 'delivery', 'canceled']);

const cronPayloadSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  statuses: z.array(statusEnum).min(1).optional(),
});

const DEFAULT_STATUSES = ['customer-leds', 'pending', 'processing', 'delivery', 'canceled'] as const;

function resolvePreviousMonth() {
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: ref.getFullYear(), month: ref.getMonth() + 1 };
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.SMS_SNAPSHOT_CRON_SECRET?.trim();
  if (!secret) return false;

  const headerSecret = request.headers.get('x-snapshot-secret')?.trim();
  const authHeader = request.headers.get('authorization')?.trim();
  const bearer = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';

  return headerSecret === secret || bearer === secret;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = cronPayloadSchema.parse(rawBody);

    const fallbackMonth = resolvePreviousMonth();
    const year = parsed.year ?? fallbackMonth.year;
    const month = parsed.month ?? fallbackMonth.month;
    const statuses = parsed.statuses ?? [...DEFAULT_STATUSES];

    const snapshots = await createMonthlySnapshot({
      year,
      month,
      statuses,
    });

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        statuses,
        totalSnapshots: snapshots.length,
        summary: snapshots.map((item) => ({
          status: item.status,
          total: item.total,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid cron payload format' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
