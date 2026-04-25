import { prisma } from '@/lib/prisma';
import { getLeadRecipientsByFilter, LeadSmsStatus, SmsRecipientRow } from '@/lib/integrations/smsRecipients';

export type MonthlySmsSnapshot = {
  status: LeadSmsStatus;
  year: number;
  month: number;
  createdAt: string;
  total: number;
  rows: SmsRecipientRow[];
};

const SNAPSHOT_PREFIX = 'integrations.sms.snapshot';

function snapshotKey(status: LeadSmsStatus, year: number, month: number): string {
  return `${SNAPSHOT_PREFIX}.${year}-${String(month).padStart(2, '0')}.${status}`;
}

function parseSnapshot(raw: string | null | undefined): MonthlySmsSnapshot | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as MonthlySmsSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;

    if (
      (parsed.status !== 'customer-leds' &&
        parsed.status !== 'pending' &&
        parsed.status !== 'processing' &&
        parsed.status !== 'delivery' &&
        parsed.status !== 'canceled') ||
      !Number.isInteger(parsed.year) ||
      !Number.isInteger(parsed.month) ||
      !Array.isArray(parsed.rows)
    ) {
      return null;
    }

    return {
      status: parsed.status,
      year: parsed.year,
      month: parsed.month,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      total: Number.isInteger(parsed.total) ? parsed.total : parsed.rows.length,
      rows: parsed.rows,
    };
  } catch {
    return null;
  }
}

export async function createMonthlySnapshot(params: {
  year: number;
  month: number;
  statuses: LeadSmsStatus[];
}): Promise<MonthlySmsSnapshot[]> {
  const uniqueStatuses = Array.from(new Set(params.statuses));
  const snapshots: MonthlySmsSnapshot[] = [];

  for (const status of uniqueStatuses) {
    const result = await getLeadRecipientsByFilter({
      statuses: [status],
      year: params.year,
      month: params.month,
    });

    const snapshot: MonthlySmsSnapshot = {
      status,
      year: params.year,
      month: params.month,
      createdAt: new Date().toISOString(),
      total: result.recipients.length,
      rows: result.recipients,
    };

    await prisma.setting.upsert({
      where: { key: snapshotKey(status, params.year, params.month) },
      update: { value: JSON.stringify(snapshot) },
      create: {
        key: snapshotKey(status, params.year, params.month),
        value: JSON.stringify(snapshot),
      },
    });

    snapshots.push(snapshot);
  }

  return snapshots;
}

export async function getMonthlySnapshot(params: {
  year: number;
  month: number;
  status: LeadSmsStatus;
}): Promise<MonthlySmsSnapshot | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: snapshotKey(params.status, params.year, params.month) },
  });

  return parseSnapshot(setting?.value);
}

export async function listMonthlySnapshots(params: {
  year: number;
  month: number;
  statuses: LeadSmsStatus[];
}): Promise<Array<{ status: LeadSmsStatus; total: number; createdAt: string | null; exists: boolean }>> {
  const uniqueStatuses = Array.from(new Set(params.statuses));

  const results = await Promise.all(
    uniqueStatuses.map(async (status) => {
      const setting = await prisma.setting.findUnique({
        where: { key: snapshotKey(status, params.year, params.month) },
      });

      const parsed = parseSnapshot(setting?.value);
      return {
        status,
        total: parsed?.total ?? 0,
        createdAt: parsed?.createdAt ?? null,
        exists: Boolean(parsed),
      };
    })
  );

  return results;
}
