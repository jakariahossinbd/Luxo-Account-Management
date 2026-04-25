import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getLeadRecipientsByFilter, LeadSmsStatus } from '@/lib/integrations/smsRecipients';

const statusEnum = z.enum(['customer-leds', 'pending', 'processing', 'delivery', 'canceled']);

const recipientsFilterSchema = z.object({
  statuses: z.array(statusEnum).min(1),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

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

function parseStatuses(raw: string | null): LeadSmsStatus[] {
  if (!raw) return ['customer-leds', 'pending', 'processing', 'delivery', 'canceled'];

  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is LeadSmsStatus =>
      entry === 'customer-leds' ||
      entry === 'pending' ||
      entry === 'processing' ||
      entry === 'delivery' ||
      entry === 'canceled'
    );
}

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);

    const parsedFilter = recipientsFilterSchema.parse({
      statuses: parseStatuses(url.searchParams.get('statuses')),
      year: parsePositiveInt(url.searchParams.get('year')),
      month: parsePositiveInt(url.searchParams.get('month')),
      day: parsePositiveInt(url.searchParams.get('day')),
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
    });

    const result = await getLeadRecipientsByFilter(parsedFilter);

    return NextResponse.json({
      success: true,
      data: {
        filters: parsedFilter,
        totalRecipients: result.recipients.length,
        summary: result.summary,
        recipients: result.recipients,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid recipient filter format' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
