import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { authOptions } from '@/lib/auth';
import { getMonthlySnapshot } from '@/lib/integrations/smsSnapshots';

const statusEnum = z.enum(['customer-leds', 'pending', 'processing', 'delivery', 'canceled']);

const exportSnapshotSchema = z.object({
  status: statusEnum,
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
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

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = exportSnapshotSchema.parse({
      status: url.searchParams.get('status'),
      year: parsePositiveInt(url.searchParams.get('year')),
      month: parsePositiveInt(url.searchParams.get('month')),
    });

    const snapshot = await getMonthlySnapshot(parsed);
    if (!snapshot) {
      return NextResponse.json({ success: false, error: 'Snapshot not found. Create snapshot first.' }, { status: 404 });
    }

    const rows = snapshot.rows.map((item) => ({
      Phone: item.phone,
      CustomerName: item.customerName,
      Status: item.status,
      OrderId: item.orderId,
      Date: item.date,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Phone: '', CustomerName: '', Status: parsed.status, OrderId: '', Date: '' }]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Snapshot');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const fileName = `sms-snapshot-${parsed.status}-${parsed.year}-${String(parsed.month).padStart(2, '0')}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid snapshot export query' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
