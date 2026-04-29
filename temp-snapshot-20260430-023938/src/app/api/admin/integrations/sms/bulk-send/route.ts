import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { sendCustomSms } from '@/lib/integrations/delivery';
import { getLeadRecipientsByFilter } from '@/lib/integrations/smsRecipients';

const statusEnum = z.enum(['customer-leds', 'pending', 'processing', 'delivery', 'canceled']);

const filterSchema = z.object({
  statuses: z.array(statusEnum).min(1),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

const bulkSendSchema = z.object({
  message: z.string().trim().min(1).max(500),
  recipients: z.array(z.string().trim().min(3)).max(500).optional(),
  filter: filterSchema.optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null;
  }
  return session;
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bulkSendSchema.parse({
      message: body.message,
      recipients: Array.isArray(body.recipients) ? body.recipients : undefined,
      filter: body.filter,
    });

    let resolvedRecipients: string[] = [];

    if (parsed.filter) {
      const filtered = await getLeadRecipientsByFilter(parsed.filter);
      resolvedRecipients = filtered.recipients.map((item) => item.phone);
    } else {
      resolvedRecipients = parsed.recipients || [];
    }

    const uniqueRecipients = Array.from(new Set(resolvedRecipients.map((entry) => entry.trim()).filter(Boolean)));
    if (uniqueRecipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No recipients found for selected filter' }, { status: 400 });
    }

    if (uniqueRecipients.length > 500) {
      return NextResponse.json({ success: false, error: 'Recipient limit exceeded (max 500)' }, { status: 400 });
    }

    const results: Array<{ recipient: string; state: 'pending' | 'done' | 'deny'; reason?: string }> = [];

    for (const recipient of uniqueRecipients) {
      const result = await sendCustomSms(recipient, parsed.message);
      results.push({
        recipient,
        state: result.state,
        reason: result.reason,
      });
    }

    const summary = {
      total: results.length,
      done: results.filter((item) => item.state === 'done').length,
      deny: results.filter((item) => item.state === 'deny').length,
      pending: results.filter((item) => item.state === 'pending').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        source: parsed.filter ? 'filter' : 'manual',
        summary,
        results,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid bulk SMS payload' }, { status: 400 });
    }

    console.error('Admin SMS bulk send POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
