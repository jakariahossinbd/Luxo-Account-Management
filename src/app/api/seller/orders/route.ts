import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { OrderStage } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dispatchDeliveryIntegrations } from '@/lib/integrations/delivery';

type SalesOrderStatus = 'pending' | 'processing' | 'delivery' | 'canceled' | 'customer-leds';
type DeliveryIndicatorState = 'pending' | 'done' | 'deny';

type SalesOrderPayload = {
  orderId: string;
  name: string;
  mobile: string;
  date: string;
  status: SalesOrderStatus;
  smsState?: DeliveryIndicatorState;
  courierState?: DeliveryIndicatorState;
  contactType?: 'mobile' | 'whatsapp';
  villageRoad?: string;
  policeStation?: string;
  district?: string;
  productsDetails?: string;
  subTotal?: string;
  discount?: string;
  totalTaka?: string;
  sampleImageName?: string;
};

type OrdersSyncPayload = {
  salesOrders?: SalesOrderPayload[];
  ledsOrders?: SalesOrderPayload[];
};

type PaginatedOrdersResult = {
  items: SalesOrderPayload[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type OrderMeta = {
  source: 'seller-dashboard-orders';
  date?: string;
  lastStatus?: SalesOrderStatus;
  smsState?: DeliveryIndicatorState;
  courierState?: DeliveryIndicatorState;
  contactType?: 'mobile' | 'whatsapp';
  villageRoad?: string;
  policeStation?: string;
  district?: string;
  productsDetails?: string;
  subTotal?: string;
  discount?: string;
  totalTaka?: string;
  sampleImageName?: string;
};

function normalizeIndicatorState(value: unknown): DeliveryIndicatorState {
  return value === 'done' || value === 'deny' ? value : 'pending';
}

const sourceMarker = '"source":"seller-dashboard-orders"';

const stageByStatus: Record<SalesOrderStatus, OrderStage> = {
  'customer-leds': 'LEAD',
  pending: 'TRANSFERRED',
  processing: 'CONFIRMED',
  delivery: 'DONE',
  canceled: 'CANCELLED',
};

const statusByStage: Record<OrderStage, SalesOrderStatus> = {
  LEAD: 'customer-leds',
  TRANSFERRED: 'pending',
  CONFIRMED: 'processing',
  DONE: 'delivery',
  CANCELLED: 'canceled',
};

function parseOrderMeta(notes: string | null): OrderMeta {
  if (!notes) return { source: 'seller-dashboard-orders' };

  try {
    const parsed = JSON.parse(notes) as Partial<OrderMeta>;
    if (parsed?.source !== 'seller-dashboard-orders') {
      return { source: 'seller-dashboard-orders' };
    }
    return {
      source: 'seller-dashboard-orders',
      date: typeof parsed.date === 'string' ? parsed.date : undefined,
      lastStatus: parseStatusOrUndefined(parsed.lastStatus),
      smsState: normalizeIndicatorState(parsed.smsState),
      courierState: normalizeIndicatorState(parsed.courierState),
      contactType: parsed.contactType === 'mobile' || parsed.contactType === 'whatsapp' ? parsed.contactType : undefined,
      villageRoad: typeof parsed.villageRoad === 'string' ? parsed.villageRoad : undefined,
      policeStation: typeof parsed.policeStation === 'string' ? parsed.policeStation : undefined,
      district: typeof parsed.district === 'string' ? parsed.district : undefined,
      productsDetails: typeof parsed.productsDetails === 'string' ? parsed.productsDetails : undefined,
      subTotal: typeof parsed.subTotal === 'string' ? parsed.subTotal : undefined,
      discount: typeof parsed.discount === 'string' ? parsed.discount : undefined,
      totalTaka: typeof parsed.totalTaka === 'string' ? parsed.totalTaka : undefined,
      sampleImageName: typeof parsed.sampleImageName === 'string' ? parsed.sampleImageName : undefined,
    };
  } catch {
    return { source: 'seller-dashboard-orders' };
  }
}

function toDisplayDate(value: Date): string {
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
}

function normalizeStatus(value: unknown): SalesOrderStatus {
  if (value === 'pending' || value === 'processing' || value === 'delivery' || value === 'canceled' || value === 'customer-leds') {
    return value;
  }
  return 'customer-leds';
}

function parseStatusOrUndefined(value: unknown): SalesOrderStatus | undefined {
  if (value === 'pending' || value === 'processing' || value === 'delivery' || value === 'canceled' || value === 'customer-leds') {
    return value;
  }
  return undefined;
}

function normalizeOrderPayload(item: unknown): SalesOrderPayload | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;

  if (typeof row.orderId !== 'string' || typeof row.name !== 'string' || typeof row.mobile !== 'string') {
    return null;
  }

  return {
    orderId: row.orderId.trim(),
    name: row.name.trim(),
    mobile: row.mobile.trim(),
    date: typeof row.date === 'string' ? row.date : '',
    status: normalizeStatus(row.status),
    smsState: normalizeIndicatorState(row.smsState),
    courierState: normalizeIndicatorState(row.courierState),
    contactType: row.contactType === 'mobile' || row.contactType === 'whatsapp' ? row.contactType : undefined,
    villageRoad: typeof row.villageRoad === 'string' ? row.villageRoad : undefined,
    policeStation: typeof row.policeStation === 'string' ? row.policeStation : undefined,
    district: typeof row.district === 'string' ? row.district : undefined,
    productsDetails: typeof row.productsDetails === 'string' ? row.productsDetails : undefined,
    subTotal: typeof row.subTotal === 'string' ? row.subTotal : undefined,
    discount: typeof row.discount === 'string' ? row.discount : undefined,
    totalTaka: typeof row.totalTaka === 'string' ? row.totalTaka : undefined,
    sampleImageName: typeof row.sampleImageName === 'string' ? row.sampleImageName : undefined,
  };
}

function mapLeadToOrder(lead: {
  leadId: string;
  customerName: string;
  phone: string;
  notes: string | null;
  stage: OrderStage;
  productNote: string | null;
  createdAt: Date;
}): SalesOrderPayload {
  const meta = parseOrderMeta(lead.notes);
  const status = statusByStage[lead.stage] || 'customer-leds';

  return {
    orderId: lead.leadId,
    name: lead.customerName,
    mobile: lead.phone,
    date: meta.date || toDisplayDate(lead.createdAt),
    status,
    smsState: meta.smsState || 'pending',
    courierState: meta.courierState || 'pending',
    contactType: meta.contactType,
    villageRoad: meta.villageRoad,
    policeStation: meta.policeStation,
    district: meta.district,
    productsDetails: meta.productsDetails || lead.productNote || '',
    subTotal: meta.subTotal,
    discount: meta.discount,
    totalTaka: meta.totalTaka,
    sampleImageName: meta.sampleImageName,
  };
}

function paginateOrders(items: SalesOrderPayload[], page: number, limit: number): PaginatedOrdersResult {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : items.length || 1;
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / safeLimit), 1);
  const start = (safePage - 1) * safeLimit;

  return {
    items: items.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const pageParam = Number.parseInt(url.searchParams.get('page') || '', 10);
    const limitParam = Number.parseInt(url.searchParams.get('limit') || '', 10);
    const hasPagination = Number.isFinite(pageParam) || Number.isFinite(limitParam);

    const rows = await prisma.lead.findMany({
      where: {
        createdById: session.user.id,
        notes: {
          contains: sourceMarker,
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        leadId: true,
        customerName: true,
        phone: true,
        notes: true,
        stage: true,
        productNote: true,
        createdAt: true,
      },
    });

    const orders = rows.map(mapLeadToOrder);
    const salesOrders = orders.filter((item) => item.status !== 'customer-leds');
    const ledsOrders = orders.filter((item) => item.status === 'customer-leds');

    if (hasPagination) {
      const salesPage = paginateOrders(salesOrders, pageParam || 1, limitParam || salesOrders.length || 1);
      const ledsPage = paginateOrders(ledsOrders, pageParam || 1, limitParam || ledsOrders.length || 1);

      return NextResponse.json({
        success: true,
        data: {
          salesOrders: salesPage.items,
          ledsOrders: ledsPage.items,
        },
        pagination: {
          sales: salesPage.pagination,
          leds: ledsPage.pagination,
        },
      });
    }

    return NextResponse.json({ success: true, data: { salesOrders, ledsOrders } });
  } catch (error) {
    console.error('Seller orders GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as OrdersSyncPayload;
    const salesRows = Array.isArray(body.salesOrders) ? body.salesOrders : [];
    const ledsRows = Array.isArray(body.ledsOrders) ? body.ledsOrders : [];

    const merged = [...ledsRows, ...salesRows]
      .map((item) => normalizeOrderPayload(item))
      .filter((item): item is SalesOrderPayload => item !== null && item.orderId.length > 0 && item.name.length > 0 && item.mobile.length > 0);

    const dedupedByOrderId = Array.from(new Map(merged.map((item) => [item.orderId, item])).values());
    const incomingOrderIds = new Set(dedupedByOrderId.map((item) => item.orderId));

    const existingRows = await prisma.lead.findMany({
      where: {
        createdById: session.user.id,
        notes: {
          contains: sourceMarker,
        },
      },
      select: {
        id: true,
        leadId: true,
        customerName: true,
        phone: true,
        stage: true,
        notes: true,
      },
    });

    const existingByOrderId = new Map(existingRows.map((item) => [item.leadId, item]));

    const integrationJobs: Array<{
      orderId: string;
      status: SalesOrderStatus;
      customerName: string;
      phone: string;
      orderDate: string;
    }> = [];

    await prisma.$transaction(async (tx) => {
      for (const item of dedupedByOrderId) {
        const existingRow = existingByOrderId.get(item.orderId);
        const existingMeta = existingRow ? parseOrderMeta(existingRow.notes) : null;
        const previousStatus = existingMeta?.lastStatus || (existingRow ? statusByStage[existingRow.stage] : undefined);
        const isStatusTransition = !existingRow || previousStatus !== item.status;
        const isProcessingTransition = isStatusTransition && item.status === 'processing';

        const meta: OrderMeta = {
          source: 'seller-dashboard-orders',
          date: item.date,
          lastStatus: item.status,
          smsState:
            isStatusTransition
              ? 'pending'
              : typeof item.smsState === 'string'
              ? normalizeIndicatorState(item.smsState)
              : existingMeta?.smsState || 'pending',
          courierState:
            isProcessingTransition
              ? 'pending'
              : typeof item.courierState === 'string'
              ? normalizeIndicatorState(item.courierState)
              : existingMeta?.courierState || 'pending',
          contactType: item.contactType,
          villageRoad: item.villageRoad,
          policeStation: item.policeStation,
          district: item.district,
          productsDetails: item.productsDetails,
          subTotal: item.subTotal,
          discount: item.discount,
          totalTaka: item.totalTaka,
          sampleImageName: item.sampleImageName,
        };

        if (existingRow) {
          await tx.lead.update({
            where: { leadId: item.orderId },
            data: {
              customerName: item.name,
              phone: item.mobile,
              notes: JSON.stringify(meta),
              quantity: null,
              productNote: item.productsDetails || '',
              stage: stageByStatus[item.status],
            },
          });
        } else {
          await tx.lead.create({
            data: {
              leadId: item.orderId,
              customerName: item.name,
              phone: item.mobile,
              notes: JSON.stringify(meta),
              quantity: null,
              productNote: item.productsDetails || '',
              stage: stageByStatus[item.status],
              createdById: session.user.id,
            },
          });
        }

        if (isStatusTransition) {
          integrationJobs.push({
            orderId: item.orderId,
            status: item.status,
            customerName: item.name,
            phone: item.mobile,
            orderDate: item.date,
          });
        }
      }

      const staleOrderIds = existingRows.filter((row) => !incomingOrderIds.has(row.leadId)).map((row) => row.leadId);
      if (staleOrderIds.length > 0) {
        await tx.lead.deleteMany({
          where: {
            createdById: session.user.id,
            leadId: { in: staleOrderIds },
          },
        });
      }
    });

    for (const job of integrationJobs) {
      try {
        const result = await dispatchDeliveryIntegrations({
          orderId: job.orderId,
          customerName: job.customerName,
          phone: job.phone,
          orderDate: job.orderDate,
          status: job.status,
        });

        const row = await prisma.lead.findUnique({
          where: { leadId: job.orderId },
          select: { notes: true },
        });

        const currentMeta = parseOrderMeta(row?.notes || null);

        const nextMeta: OrderMeta = {
          ...currentMeta,
          lastStatus: job.status,
          smsState: result.smsState,
          courierState: job.status === 'processing' ? result.courierState : currentMeta.courierState || 'pending',
        };

        await prisma.lead.update({
          where: { leadId: job.orderId },
          data: {
            notes: JSON.stringify(nextMeta),
          },
        });
      } catch (error) {
        console.error(`Delivery integration dispatch failed for ${job.orderId}:`, error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seller orders PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const deletedRows = await prisma.lead.deleteMany({
      where: {
        createdById: session.user.id,
        notes: {
          contains: sourceMarker,
        },
      },
    });

    return NextResponse.json({ success: true, deleted: deletedRows.count });
  } catch (error) {
    console.error('Seller orders DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
