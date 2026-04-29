import { OrderStage } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeBdPhone } from '@/lib/phone';

export type LeadSmsStatus = 'customer-leds' | 'pending' | 'processing' | 'delivery' | 'canceled';

export type RecipientFilter = {
  statuses: LeadSmsStatus[];
  year?: number;
  month?: number;
  day?: number;
  from?: string;
  to?: string;
};

export type SmsRecipientRow = {
  orderId: string;
  customerName: string;
  phone: string;
  status: LeadSmsStatus;
  date: string;
};

const stageByStatus: Record<LeadSmsStatus, OrderStage> = {
  'customer-leds': 'LEAD',
  pending: 'TRANSFERRED',
  processing: 'CONFIRMED',
  delivery: 'DONE',
  canceled: 'CANCELLED',
};

const statusByStage: Record<OrderStage, LeadSmsStatus> = {
  LEAD: 'customer-leds',
  TRANSFERRED: 'pending',
  CONFIRMED: 'processing',
  DONE: 'delivery',
  CANCELLED: 'canceled',
};

function toDisplayDate(dateValue: Date): string {
  const day = String(dateValue.getDate()).padStart(2, '0');
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const year = dateValue.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseOrderDateFromNotes(notes: string | null, fallback: Date): string {
  if (!notes) return toDisplayDate(fallback);

  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    if (typeof parsed.date === 'string' && parsed.date.trim().length > 0) {
      return parsed.date;
    }
  } catch {
    // Ignore malformed JSON and fall back to createdAt.
  }

  return toDisplayDate(fallback);
}

function buildDateBounds(filter: RecipientFilter): { start?: Date; end?: Date } {
  const fromRaw = filter.from?.trim();
  const toRaw = filter.to?.trim();

  if (fromRaw || toRaw) {
    const start = fromRaw ? new Date(`${fromRaw}T00:00:00`) : undefined;
    const end = toRaw ? new Date(`${toRaw}T23:59:59.999`) : undefined;

    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      throw new Error('Invalid from/to date format');
    }

    return { start, end };
  }

  if (!filter.year) {
    return {};
  }

  const year = filter.year;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Invalid year value');
  }

  if (filter.month && (!Number.isInteger(filter.month) || filter.month < 1 || filter.month > 12)) {
    throw new Error('Invalid month value');
  }

  if (filter.day && (!Number.isInteger(filter.day) || filter.day < 1 || filter.day > 31)) {
    throw new Error('Invalid day value');
  }

  if (filter.month && filter.day) {
    const start = new Date(year, filter.month - 1, filter.day, 0, 0, 0, 0);
    const end = new Date(year, filter.month - 1, filter.day, 23, 59, 59, 999);
    return { start, end };
  }

  if (filter.month) {
    const start = new Date(year, filter.month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, filter.month, 0, 23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function normalizeStatuses(input: LeadSmsStatus[]): LeadSmsStatus[] {
  const safeStatuses = input.filter((status) => status in stageByStatus);
  return Array.from(new Set(safeStatuses));
}

export async function getLeadRecipientsByFilter(filter: RecipientFilter): Promise<{
  recipients: SmsRecipientRow[];
  summary: Record<LeadSmsStatus, number>;
}> {
  const statuses = normalizeStatuses(filter.statuses);
  if (statuses.length === 0) {
    return {
      recipients: [],
      summary: {
        'customer-leds': 0,
        pending: 0,
        processing: 0,
        delivery: 0,
        canceled: 0,
      },
    };
  }

  const dateBounds = buildDateBounds(filter);
  const stages = statuses.map((status) => stageByStatus[status]);

  const rows = await prisma.lead.findMany({
    where: {
      stage: { in: stages },
      ...(dateBounds.start || dateBounds.end
        ? {
            createdAt: {
              ...(dateBounds.start ? { gte: dateBounds.start } : {}),
              ...(dateBounds.end ? { lte: dateBounds.end } : {}),
            },
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      leadId: true,
      customerName: true,
      phone: true,
      stage: true,
      createdAt: true,
      notes: true,
    },
  });

  const dedupe = new Set<string>();
  const summary: Record<LeadSmsStatus, number> = {
    'customer-leds': 0,
    pending: 0,
    processing: 0,
    delivery: 0,
    canceled: 0,
  };

  const recipients: SmsRecipientRow[] = [];

  for (const row of rows) {
    const normalizedPhone = normalizeBdPhone(row.phone);
    if (!normalizedPhone) continue;

    const status = statusByStage[row.stage] || 'customer-leds';
    if (!statuses.includes(status)) continue;

    const key = `${status}:${normalizedPhone}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);

    recipients.push({
      orderId: row.leadId,
      customerName: row.customerName,
      phone: normalizedPhone,
      status,
      date: parseOrderDateFromNotes(row.notes, row.createdAt),
    });

    summary[status] += 1;
  }

  return { recipients, summary };
}
