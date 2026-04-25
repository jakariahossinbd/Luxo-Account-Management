import { prisma } from '@/lib/prisma';
import { normalizeBdPhone, toBdPhoneE164 } from '@/lib/phone';

export type DeliveryIndicatorState = 'pending' | 'done' | 'deny';

type SalesOrderStatus = 'pending' | 'processing' | 'delivery' | 'canceled' | 'customer-leds';

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

export type ChannelDispatchResult = {
  state: DeliveryIndicatorState;
  reason?: string;
};

type DispatchContext = {
  orderId: string;
  customerName: string;
  phone: string;
  orderDate: string;
  status: SalesOrderStatus;
};

const COURIER_CONFIG_KEY = 'integrations.courier.config';
const SMS_CONFIG_KEY = 'integrations.sms.config';
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

function parseSmsTemplates(raw: string | null | undefined): SmsTemplates {
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

function resolveDispatchUrl(base: string, fallbackPath: string): string {
  const trimmed = base.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === '/' || parsed.pathname === '') {
      parsed.pathname = fallbackPath;
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

function parseStrictSuccessValues(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function readPathValue(payload: unknown, path: string): unknown {
  if (!payload || typeof payload !== 'object') return undefined;

  let cursor: unknown = payload;
  for (const segment of path.split('.').map((item) => item.trim()).filter(Boolean)) {
    if (!cursor || typeof cursor !== 'object' || !(segment in (cursor as Record<string, unknown>))) {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

function strictResponseMatched(payload: unknown, successPath: string, successValuesRaw: string): boolean {
  const successValues = parseStrictSuccessValues(successValuesRaw);
  if (!successPath.trim() || successValues.length === 0) {
    return false;
  }

  const value = readPathValue(payload, successPath);
  if (typeof value === 'boolean') {
    return successValues.includes(value ? 'true' : 'false');
  }

  if (typeof value === 'number') {
    return successValues.includes(String(value));
  }

  if (typeof value === 'string') {
    return successValues.includes(value.trim().toLowerCase());
  }

  return false;
}

function classifyHttpState(statusCode: number): DeliveryIndicatorState {
  if (statusCode >= 200 && statusCode < 300) return 'done';
  if (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 422) return 'deny';
  return 'pending';
}

async function waitMs(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function dispatchWithRetry(params: {
  maxRetryAttempts: number;
  baseRetryDelayMs: number;
  execute: () => Promise<ChannelDispatchResult>;
}): Promise<ChannelDispatchResult> {
  const maxAttempts = Math.min(Math.max(params.maxRetryAttempts, 1), 5);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await params.execute();

    if (result.state === 'done' || result.state === 'deny') {
      return result;
    }

    if (attempt === maxAttempts) {
      return { state: 'pending', reason: result.reason || 'Temporary failure after retries' };
    }

    const backoff = Math.min(10_000, params.baseRetryDelayMs * 2 ** (attempt - 1));
    const jitter = Math.floor(Math.random() * 200);
    await waitMs(backoff + jitter);
  }

  return { state: 'pending', reason: 'Temporary failure' };
}

async function dispatchCourierSteadfast(config: CourierConfig, context: DispatchContext): Promise<ChannelDispatchResult> {
  if (!config.enabled || !config.autoCreateOnProcessing || context.status !== 'processing') {
    return { state: 'pending', reason: 'Courier trigger is disabled' };
  }

  if (!config.apiKey || !config.secretKey) {
    return { state: 'deny', reason: 'Courier credentials are missing' };
  }

  const normalizedPhone = normalizeBdPhone(context.phone);
  if (!normalizedPhone) {
    return { state: 'deny', reason: 'Invalid customer phone for courier' };
  }

  const dispatchPath = config.strictMode ? config.endpointPath : '/create_order';
  const dispatchUrl = resolveDispatchUrl(config.baseUrl, dispatchPath);
  if (!dispatchUrl) {
    return { state: 'deny', reason: 'Courier API URL is missing or invalid' };
  }

  return dispatchWithRetry({
    maxRetryAttempts: 3,
    baseRetryDelayMs: 1200,
    execute: async () => {
      try {
        const response = await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            'Api-Key': config.apiKey,
            'Secret-Key': config.secretKey,
          },
          body: JSON.stringify({
            order_id: context.orderId,
            customer_name: context.customerName,
            customer_phone: toBdPhoneE164(normalizedPhone),
            order_date: context.orderDate,
            delivery_partner: 'STEADFAST',
          }),
        });

        if (config.strictMode) {
          if (!response.ok) {
            return {
              state: classifyHttpState(response.status),
              reason: `Courier API responded with status ${response.status}`,
            };
          }

          const responseJson = await response.json().catch(() => null);
          if (!strictResponseMatched(responseJson, config.responseSuccessPath, config.responseSuccessValues)) {
            return { state: 'deny', reason: 'Courier strict response signature mismatch' };
          }

          return { state: 'done' };
        }

        const state = classifyHttpState(response.status);
        if (state === 'done') return { state };

        const reason = `Courier API responded with status ${response.status}`;
        return { state, reason };
      } catch {
        return { state: 'pending', reason: 'Courier temporary transport failure' };
      }
    },
  });
}

function buildSmsMessage(context: DispatchContext, templates: SmsTemplates): string {
  const templateByStatus: Record<SalesOrderStatus, string> = {
    'customer-leds': templates.customerLeds,
    pending: templates.pending,
    processing: templates.processing,
    delivery: templates.delivery,
    canceled: templates.canceled,
  };

  const template = templateByStatus[context.status];
  const safeName = context.customerName.trim() || 'Customer';
  const courierName = 'courier';

  return template
    .replaceAll('{orderId}', context.orderId)
    .replaceAll('{customerName}', safeName)
    .replaceAll('{orderDate}', context.orderDate)
    .replaceAll('{courier}', courierName)
    .replaceAll('{status}', context.status)
    .trim();
}

function shouldSendSmsForStatus(config: SmsGatewayConfig, status: SalesOrderStatus): boolean {
  if (status === 'customer-leds') return config.triggerOnCustomerLeds;
  if (status === 'pending') return config.triggerOnPending;
  if (status === 'processing') return config.triggerOnProcessing;
  if (status === 'delivery') return config.triggerOnDelivery;
  return config.triggerOnCanceled;
}

async function dispatchSmsZaman(config: SmsGatewayConfig, context: DispatchContext): Promise<ChannelDispatchResult> {
  if (!config.enabled) {
    return { state: 'pending', reason: 'SMS gateway is disabled' };
  }

  if (!shouldSendSmsForStatus(config, context.status)) {
    return { state: 'pending', reason: `${context.status.toUpperCase()} SMS trigger disabled` };
  }

  if (!config.apiUrl || !config.apiKey || !config.senderId) {
    return { state: 'deny', reason: 'SMS gateway credentials are missing' };
  }

  const normalizedPhone = normalizeBdPhone(context.phone);
  if (!normalizedPhone) {
    return { state: 'deny', reason: 'Invalid customer phone for SMS' };
  }

  const dispatchPath = config.strictMode ? config.endpointPath : '/';
  const dispatchUrl = resolveDispatchUrl(config.apiUrl, dispatchPath);
  if (!dispatchUrl) {
    return { state: 'deny', reason: 'SMS API URL is missing or invalid' };
  }

  const smsTemplatesSetting = await prisma.setting.findUnique({ where: { key: SMS_TEMPLATES_KEY } });
  const smsTemplates = parseSmsTemplates(smsTemplatesSetting?.value);
  const message = buildSmsMessage(context, smsTemplates);

  return dispatchWithRetry({
    maxRetryAttempts: config.maxRetryAttempts,
    baseRetryDelayMs: config.baseRetryDelayMs,
    execute: async () => {
      try {
        const response = await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            'Api-Key': config.apiKey,
          },
          body: JSON.stringify({
            to: normalizedPhone,
            msisdn: normalizedPhone,
            recipient: normalizedPhone,
            sender_id: config.senderId,
            sender: config.senderId,
            message,
          }),
        });

        if (config.strictMode) {
          if (!response.ok) {
            return {
              state: classifyHttpState(response.status),
              reason: `SMS API responded with status ${response.status}`,
            };
          }

          const responseJson = await response.json().catch(() => null);
          if (!strictResponseMatched(responseJson, config.responseSuccessPath, config.responseSuccessValues)) {
            return { state: 'deny', reason: 'SMS strict response signature mismatch' };
          }

          return { state: 'done' };
        }

        const state = classifyHttpState(response.status);
        if (state === 'done') return { state };

        const reason = `SMS API responded with status ${response.status}`;
        return { state, reason };
      } catch {
        return { state: 'pending', reason: 'SMS temporary transport failure' };
      }
    },
  });
}

export async function sendCustomSms(recipientPhone: string, message: string): Promise<ChannelDispatchResult> {
  const setting = await prisma.setting.findUnique({ where: { key: SMS_CONFIG_KEY } });
  const config = parseSmsConfig(setting?.value);

  if (!config.enabled) {
    return { state: 'pending', reason: 'SMS gateway is disabled' };
  }

  if (!config.apiUrl || !config.apiKey || !config.senderId) {
    return { state: 'deny', reason: 'SMS gateway credentials are missing' };
  }

  const normalizedPhone = normalizeBdPhone(recipientPhone);
  if (!normalizedPhone) {
    return { state: 'deny', reason: 'Invalid customer phone for SMS' };
  }

  const dispatchUrl = resolveDispatchUrl(config.apiUrl, '/');
  if (!dispatchUrl) {
    return { state: 'deny', reason: 'SMS API URL is missing or invalid' };
  }

  return dispatchWithRetry({
    maxRetryAttempts: config.maxRetryAttempts,
    baseRetryDelayMs: config.baseRetryDelayMs,
    execute: async () => {
      try {
        const response = await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            'Api-Key': config.apiKey,
          },
          body: JSON.stringify({
            to: normalizedPhone,
            msisdn: normalizedPhone,
            recipient: normalizedPhone,
            sender_id: config.senderId,
            sender: config.senderId,
            message,
          }),
        });

        const state = classifyHttpState(response.status);
        if (state === 'done') return { state };

        const reason = `SMS API responded with status ${response.status}`;
        return { state, reason };
      } catch {
        return { state: 'pending', reason: 'SMS temporary transport failure' };
      }
    },
  });
}

export async function dispatchDeliveryIntegrations(context: DispatchContext): Promise<{
  smsState: DeliveryIndicatorState;
  courierState: DeliveryIndicatorState;
}> {
  const [courierSetting, smsSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: COURIER_CONFIG_KEY } }),
    prisma.setting.findUnique({ where: { key: SMS_CONFIG_KEY } }),
  ]);

  const courierConfig = parseCourierConfig(courierSetting?.value);
  const smsConfig = parseSmsConfig(smsSetting?.value);

  const [courierResult, smsResult] = await Promise.all([
    dispatchCourierSteadfast(courierConfig, context),
    dispatchSmsZaman(smsConfig, context),
  ]);

  return {
    smsState: smsResult.state,
    courierState: courierResult.state,
  };
}
