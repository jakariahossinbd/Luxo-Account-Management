import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const COURIER_CONFIG_KEY = 'integrations.courier.config';

type CourierConfig = {
  enabled: boolean;
  provider: string;
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  autoCreateOnProcessing: boolean;
  strictMode: boolean;
  endpointPath: string;
  responseSuccessPath: string;
  responseSuccessValues: string;
};

const DEFAULT_COURIER_CONFIG: CourierConfig = {
  enabled: false,
  provider: 'steadfast',
  apiKey: '',
  secretKey: '',
  baseUrl: '',
  autoCreateOnProcessing: true,
  strictMode: false,
  endpointPath: '/create_order',
  responseSuccessPath: 'status',
  responseSuccessValues: 'success,ok,1,true',
};

const courierConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().trim().min(1),
  apiKey: z.string().trim(),
  secretKey: z.string().trim(),
  baseUrl: z.string().trim(),
  autoCreateOnProcessing: z.boolean(),
  strictMode: z.boolean(),
  endpointPath: z.string().trim().min(1),
  responseSuccessPath: z.string().trim().min(1),
  responseSuccessValues: z.string().trim().min(1),
});

function parseCourierConfig(raw: string | null | undefined): CourierConfig {
  if (!raw) return DEFAULT_COURIER_CONFIG;

  try {
    const parsed = JSON.parse(raw) as Partial<CourierConfig>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_COURIER_CONFIG.enabled,
      provider: typeof parsed.provider === 'string' && parsed.provider.trim() ? parsed.provider.trim() : DEFAULT_COURIER_CONFIG.provider,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_COURIER_CONFIG.apiKey,
      secretKey: typeof parsed.secretKey === 'string' ? parsed.secretKey : DEFAULT_COURIER_CONFIG.secretKey,
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : DEFAULT_COURIER_CONFIG.baseUrl,
      autoCreateOnProcessing:
        typeof parsed.autoCreateOnProcessing === 'boolean'
          ? parsed.autoCreateOnProcessing
          : DEFAULT_COURIER_CONFIG.autoCreateOnProcessing,
      strictMode: typeof parsed.strictMode === 'boolean' ? parsed.strictMode : DEFAULT_COURIER_CONFIG.strictMode,
      endpointPath:
        typeof parsed.endpointPath === 'string' && parsed.endpointPath.trim().length > 0
          ? parsed.endpointPath
          : DEFAULT_COURIER_CONFIG.endpointPath,
      responseSuccessPath:
        typeof parsed.responseSuccessPath === 'string' && parsed.responseSuccessPath.trim().length > 0
          ? parsed.responseSuccessPath
          : DEFAULT_COURIER_CONFIG.responseSuccessPath,
      responseSuccessValues:
        typeof parsed.responseSuccessValues === 'string' && parsed.responseSuccessValues.trim().length > 0
          ? parsed.responseSuccessValues
          : DEFAULT_COURIER_CONFIG.responseSuccessValues,
    };
  } catch {
    return DEFAULT_COURIER_CONFIG;
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

    const setting = await prisma.setting.findUnique({ where: { key: COURIER_CONFIG_KEY } });
    const config = parseCourierConfig(setting?.value);

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Admin courier integration GET error:', error);
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
    const parsed = courierConfigSchema.parse({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : DEFAULT_COURIER_CONFIG.enabled,
      provider: typeof body.provider === 'string' ? body.provider : DEFAULT_COURIER_CONFIG.provider,
      apiKey: typeof body.apiKey === 'string' ? body.apiKey : DEFAULT_COURIER_CONFIG.apiKey,
      secretKey: typeof body.secretKey === 'string' ? body.secretKey : DEFAULT_COURIER_CONFIG.secretKey,
      baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : DEFAULT_COURIER_CONFIG.baseUrl,
      autoCreateOnProcessing:
        typeof body.autoCreateOnProcessing === 'boolean'
          ? body.autoCreateOnProcessing
          : DEFAULT_COURIER_CONFIG.autoCreateOnProcessing,
      strictMode: typeof body.strictMode === 'boolean' ? body.strictMode : DEFAULT_COURIER_CONFIG.strictMode,
      endpointPath:
        typeof body.endpointPath === 'string' && body.endpointPath.trim().length > 0
          ? body.endpointPath
          : DEFAULT_COURIER_CONFIG.endpointPath,
      responseSuccessPath:
        typeof body.responseSuccessPath === 'string' && body.responseSuccessPath.trim().length > 0
          ? body.responseSuccessPath
          : DEFAULT_COURIER_CONFIG.responseSuccessPath,
      responseSuccessValues:
        typeof body.responseSuccessValues === 'string' && body.responseSuccessValues.trim().length > 0
          ? body.responseSuccessValues
          : DEFAULT_COURIER_CONFIG.responseSuccessValues,
    });

    await prisma.setting.upsert({
      where: { key: COURIER_CONFIG_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: COURIER_CONFIG_KEY,
        value: JSON.stringify(parsed),
      },
    });

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid courier configuration format' }, { status: 400 });
    }

    console.error('Admin courier integration PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
