import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SMS_TEMPLATES_KEY = 'integrations.sms.templates';

type SmsTemplates = {
  customerLeds: string;
  pending: string;
  processing: string;
  delivery: string;
  canceled: string;
};

const DEFAULT_SMS_TEMPLATES: SmsTemplates = {
  customerLeds: 'Order {orderId} has been received as a customer lead. We will contact you soon.',
  pending: 'Order {orderId} for {customerName} is currently pending confirmation.',
  processing: 'Order {orderId} for {customerName} is now processing. Date: {orderDate}. Delivery partner: {courier}.',
  delivery: 'Order {orderId} for {customerName} is out for delivery.',
  canceled: 'Order {orderId} for {customerName} has been canceled. Contact us for support if needed.',
};

const smsTemplatesSchema = z.object({
  customerLeds: z.string().trim().min(1).max(500),
  pending: z.string().trim().min(1).max(500),
  processing: z.string().trim().min(1).max(500),
  delivery: z.string().trim().min(1).max(500),
  canceled: z.string().trim().min(1).max(500),
});

function parseTemplates(raw: string | null | undefined): SmsTemplates {
  if (!raw) return DEFAULT_SMS_TEMPLATES;

  try {
    const parsed = JSON.parse(raw) as Partial<SmsTemplates>;
    return {
      customerLeds:
        typeof parsed.customerLeds === 'string' && parsed.customerLeds.trim().length > 0
          ? parsed.customerLeds
          : DEFAULT_SMS_TEMPLATES.customerLeds,
      pending:
        typeof parsed.pending === 'string' && parsed.pending.trim().length > 0
          ? parsed.pending
          : DEFAULT_SMS_TEMPLATES.pending,
      processing:
        typeof parsed.processing === 'string' && parsed.processing.trim().length > 0
          ? parsed.processing
          : DEFAULT_SMS_TEMPLATES.processing,
      delivery:
        typeof parsed.delivery === 'string' && parsed.delivery.trim().length > 0
          ? parsed.delivery
          : typeof (parsed as any).completed === 'string' && (parsed as any).completed.trim().length > 0
            ? (parsed as any).completed
            : DEFAULT_SMS_TEMPLATES.delivery,
      canceled:
        typeof parsed.canceled === 'string' && parsed.canceled.trim().length > 0
          ? parsed.canceled
          : DEFAULT_SMS_TEMPLATES.canceled,
    };
  } catch {
    return DEFAULT_SMS_TEMPLATES;
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

    const setting = await prisma.setting.findUnique({ where: { key: SMS_TEMPLATES_KEY } });
    const templates = parseTemplates(setting?.value);

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Admin SMS templates GET error:', error);
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
    const parsed = smsTemplatesSchema.parse({
      customerLeds: typeof body.customerLeds === 'string' ? body.customerLeds : DEFAULT_SMS_TEMPLATES.customerLeds,
      pending: typeof body.pending === 'string' ? body.pending : DEFAULT_SMS_TEMPLATES.pending,
      processing: typeof body.processing === 'string' ? body.processing : DEFAULT_SMS_TEMPLATES.processing,
      delivery:
        typeof body.delivery === 'string'
          ? body.delivery
          : typeof body.completed === 'string'
            ? body.completed
            : DEFAULT_SMS_TEMPLATES.delivery,
      canceled: typeof body.canceled === 'string' ? body.canceled : DEFAULT_SMS_TEMPLATES.canceled,
    });

    await prisma.setting.upsert({
      where: { key: SMS_TEMPLATES_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SMS_TEMPLATES_KEY,
        value: JSON.stringify(parsed),
      },
    });

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid SMS templates format' }, { status: 400 });
    }

    console.error('Admin SMS templates PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
