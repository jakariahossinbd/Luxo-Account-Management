import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SMS_CONFIG_KEY = 'integrations.sms.config';

type SmsGatewayConfig = {
  enabled: boolean;
  provider: string;
  apiUrl: string;
  apiKey: string;
  senderId: string;
  triggerOnCustomerLeds: boolean;
  triggerOnPending: boolean;
  triggerOnProcessing: boolean;
  triggerOnDelivery: boolean;
  triggerOnCanceled: boolean;
  strictMode: boolean;
  endpointPath: string;
  responseSuccessPath: string;
  responseSuccessValues: string;
  maxRetryAttempts: number;
  baseRetryDelayMs: number;
};

const DEFAULT_SMS_CONFIG: SmsGatewayConfig = {
  enabled: false,
  provider: 'zaman-it',
  apiUrl: '',
  apiKey: '',
  senderId: '',
  triggerOnCustomerLeds: false,
  triggerOnPending: false,
  triggerOnProcessing: true,
  triggerOnDelivery: true,
  triggerOnCanceled: false,
  strictMode: false,
  endpointPath: '/',
  responseSuccessPath: 'status',
  responseSuccessValues: 'success,ok,1,true',
  maxRetryAttempts: 3,
  baseRetryDelayMs: 1200,
};

const smsConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().trim().min(1),
  apiUrl: z.string().trim(),
  apiKey: z.string().trim(),
  senderId: z.string().trim(),
  triggerOnCustomerLeds: z.boolean(),
  triggerOnPending: z.boolean(),
  triggerOnProcessing: z.boolean(),
  triggerOnDelivery: z.boolean(),
  triggerOnCanceled: z.boolean(),
  strictMode: z.boolean(),
  endpointPath: z.string().trim().min(1),
  responseSuccessPath: z.string().trim().min(1),
  responseSuccessValues: z.string().trim().min(1),
  maxRetryAttempts: z.number().int().min(1).max(5),
  baseRetryDelayMs: z.number().int().min(500).max(10000),
});

function parseSmsConfig(raw: string | null | undefined): SmsGatewayConfig {
  if (!raw) return DEFAULT_SMS_CONFIG;

  try {
    const parsed = JSON.parse(raw) as Partial<SmsGatewayConfig>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SMS_CONFIG.enabled,
      provider: typeof parsed.provider === 'string' && parsed.provider.trim() ? parsed.provider.trim() : DEFAULT_SMS_CONFIG.provider,
      apiUrl: typeof parsed.apiUrl === 'string' ? parsed.apiUrl : DEFAULT_SMS_CONFIG.apiUrl,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_SMS_CONFIG.apiKey,
      senderId: typeof parsed.senderId === 'string' ? parsed.senderId : DEFAULT_SMS_CONFIG.senderId,
      triggerOnCustomerLeds:
        typeof parsed.triggerOnCustomerLeds === 'boolean'
          ? parsed.triggerOnCustomerLeds
          : DEFAULT_SMS_CONFIG.triggerOnCustomerLeds,
      triggerOnPending:
        typeof parsed.triggerOnPending === 'boolean'
          ? parsed.triggerOnPending
          : DEFAULT_SMS_CONFIG.triggerOnPending,
      triggerOnProcessing:
        typeof parsed.triggerOnProcessing === 'boolean'
          ? parsed.triggerOnProcessing
          : DEFAULT_SMS_CONFIG.triggerOnProcessing,
      triggerOnDelivery:
        typeof parsed.triggerOnDelivery === 'boolean'
          ? parsed.triggerOnDelivery
          : typeof parsed.triggerOnCompleted === 'boolean'
            ? parsed.triggerOnCompleted
            : DEFAULT_SMS_CONFIG.triggerOnDelivery,
      triggerOnCanceled:
        typeof parsed.triggerOnCanceled === 'boolean'
          ? parsed.triggerOnCanceled
          : DEFAULT_SMS_CONFIG.triggerOnCanceled,
      strictMode: typeof parsed.strictMode === 'boolean' ? parsed.strictMode : DEFAULT_SMS_CONFIG.strictMode,
      endpointPath:
        typeof parsed.endpointPath === 'string' && parsed.endpointPath.trim().length > 0
          ? parsed.endpointPath
          : DEFAULT_SMS_CONFIG.endpointPath,
      responseSuccessPath:
        typeof parsed.responseSuccessPath === 'string' && parsed.responseSuccessPath.trim().length > 0
          ? parsed.responseSuccessPath
          : DEFAULT_SMS_CONFIG.responseSuccessPath,
      responseSuccessValues:
        typeof parsed.responseSuccessValues === 'string' && parsed.responseSuccessValues.trim().length > 0
          ? parsed.responseSuccessValues
          : DEFAULT_SMS_CONFIG.responseSuccessValues,
      maxRetryAttempts:
        Number.isFinite(parsed.maxRetryAttempts)
          ? Number(parsed.maxRetryAttempts)
          : DEFAULT_SMS_CONFIG.maxRetryAttempts,
      baseRetryDelayMs:
        Number.isFinite(parsed.baseRetryDelayMs)
          ? Number(parsed.baseRetryDelayMs)
          : DEFAULT_SMS_CONFIG.baseRetryDelayMs,
    };
  } catch {
    return DEFAULT_SMS_CONFIG;
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

    const setting = await prisma.setting.findUnique({ where: { key: SMS_CONFIG_KEY } });
    const config = parseSmsConfig(setting?.value);

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Admin SMS integration GET error:', error);
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
    const parsed = smsConfigSchema.parse({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : DEFAULT_SMS_CONFIG.enabled,
      provider: typeof body.provider === 'string' ? body.provider : DEFAULT_SMS_CONFIG.provider,
      apiUrl: typeof body.apiUrl === 'string' ? body.apiUrl : DEFAULT_SMS_CONFIG.apiUrl,
      apiKey: typeof body.apiKey === 'string' ? body.apiKey : DEFAULT_SMS_CONFIG.apiKey,
      senderId: typeof body.senderId === 'string' ? body.senderId : DEFAULT_SMS_CONFIG.senderId,
      triggerOnCustomerLeds:
        typeof body.triggerOnCustomerLeds === 'boolean'
          ? body.triggerOnCustomerLeds
          : DEFAULT_SMS_CONFIG.triggerOnCustomerLeds,
      triggerOnPending:
        typeof body.triggerOnPending === 'boolean'
          ? body.triggerOnPending
          : DEFAULT_SMS_CONFIG.triggerOnPending,
      triggerOnProcessing:
        typeof body.triggerOnProcessing === 'boolean'
          ? body.triggerOnProcessing
          : DEFAULT_SMS_CONFIG.triggerOnProcessing,
      triggerOnDelivery:
        typeof body.triggerOnDelivery === 'boolean'
          ? body.triggerOnDelivery
          : typeof body.triggerOnCompleted === 'boolean'
            ? body.triggerOnCompleted
            : DEFAULT_SMS_CONFIG.triggerOnDelivery,
      triggerOnCanceled:
        typeof body.triggerOnCanceled === 'boolean'
          ? body.triggerOnCanceled
          : DEFAULT_SMS_CONFIG.triggerOnCanceled,
      strictMode: typeof body.strictMode === 'boolean' ? body.strictMode : DEFAULT_SMS_CONFIG.strictMode,
      endpointPath:
        typeof body.endpointPath === 'string' && body.endpointPath.trim().length > 0
          ? body.endpointPath
          : DEFAULT_SMS_CONFIG.endpointPath,
      responseSuccessPath:
        typeof body.responseSuccessPath === 'string' && body.responseSuccessPath.trim().length > 0
          ? body.responseSuccessPath
          : DEFAULT_SMS_CONFIG.responseSuccessPath,
      responseSuccessValues:
        typeof body.responseSuccessValues === 'string' && body.responseSuccessValues.trim().length > 0
          ? body.responseSuccessValues
          : DEFAULT_SMS_CONFIG.responseSuccessValues,
      maxRetryAttempts: Number(body.maxRetryAttempts ?? DEFAULT_SMS_CONFIG.maxRetryAttempts),
      baseRetryDelayMs: Number(body.baseRetryDelayMs ?? DEFAULT_SMS_CONFIG.baseRetryDelayMs),
    });

    await prisma.setting.upsert({
      where: { key: SMS_CONFIG_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SMS_CONFIG_KEY,
        value: JSON.stringify(parsed),
      },
    });

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid SMS configuration format' }, { status: 400 });
    }

    console.error('Admin SMS integration PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
