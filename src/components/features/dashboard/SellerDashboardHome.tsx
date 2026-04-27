'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { DatePanelPicker, buildCalendarDays, monthNames } from '@/components/layout/DatePanelPicker';
import { SellerSidebar } from '@/components/layout/SellerSidebar';
import { SellerFooterNav } from '@/components/layout/SellerFooterNav';
import { Search, ShoppingCart, Users, PackageCheck, CalendarClock, BarChart3, NotebookPen, WalletCards, ArrowRight, Upload, X, Download } from 'lucide-react';
import { SupportChatWidget } from '@/components/layout/SupportChatWidget';
import { useToast } from '@/hooks/useToast';
import { DateRangeOption, useDatePanelSelection } from '@/hooks/useDatePanelSelection';
import { useCommunicationStore } from '@/store/communication';
import { SellerAttendanceDashboard } from '@/components/features/attendance/SellerAttendanceDashboard';

type SellerView = 'home' | 'create-sales' | 'customer-leds' | 'product-stock' | 'attendance' | 'monthly-report' | 'personal-note' | 'profile';

function isSellerView(value: string | null): value is SellerView {
  return value === 'home' || value === 'create-sales' || value === 'customer-leds' || value === 'product-stock' || value === 'attendance' || value === 'monthly-report' || value === 'personal-note' || value === 'profile';
}

type InventoryItem = {
  code: string;
  name: string;
  stock: number;
  image?: string | null;
  category?: string;
};

type SellerCategoryItem = {
  id: string;
  name: string;
  icon?: string | null;
};

type StockNoteCategoryContext = {
  id: string;
  name: string;
};

type ProductStockStage = 'categories' | 'products';

type GlobalSellerSearchResult = {
  id: string;
  type: 'view' | 'sales' | 'leds' | 'product' | 'category';
  label: string;
  description: string;
  view?: SellerView;
  queryValue?: string;
  categoryId?: string;
};

type SalesOrderStatus = 'pending' | 'processing' | 'delivery' | 'canceled' | 'customer-leds';
type DeliveryIndicatorState = 'pending' | 'done' | 'deny';
type SalesBoardStatus = Exclude<SalesOrderStatus, 'customer-leds'>;
type SalesFilterStatus = 'all' | SalesBoardStatus;
type LedsFilterStatus = 'all' | SalesOrderStatus;
type OrderFlowType = 'sales' | 'leds';

type SalesOrder = {
  orderId: string;
  name: string;
  mobile: string;
  date: string;
  status: SalesOrderStatus;
  smsState?: DeliveryIndicatorState;
  courierState?: DeliveryIndicatorState;
  contactType?: SalesContactType;
  villageRoad?: string;
  policeStation?: string;
  district?: string;
  productsDetails?: string;
  subTotal?: string;
  discount?: string;
  totalTaka?: string;
  sampleImageName?: string;
  sampleImageUrl?: string;
};

type SalesContactType = 'mobile' | 'whatsapp';

type CreateSalesFormState = {
  status: SalesOrderStatus;
  orderDate: string;
  orderId: string;
  customerName: string;
  contactType: SalesContactType;
  contactValue: string;
  villageRoad: string;
  policeStation: string;
  district: string;
  productsDetails: string;
  subTotal: string;
  discount: string;
  totalTaka: string;
  sampleImageName: string;
  sampleImageUrl: string;
};

type SellerOrdersResponse = {
  success?: boolean;
  data?: {
    salesOrders?: SalesOrder[];
    ledsOrders?: SalesOrder[];
  };
};

type OrdersSyncState = 'idle' | 'loading' | 'syncing' | 'saved' | 'error';

type SellerProfileResponse = {
  success?: boolean;
  data?: {
    id?: string;
    sellerId?: string;
    employeeCode?: string;
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
    salesTargetAmount?: number;
    monthlyExpensesAmount?: number;
  };
};

type ProductsResponse = {
  success?: boolean;
  data?: Array<{
    sku?: string;
    name?: string;
    quantity?: number;
    imageUrl?: string | null;
    category?: {
      id?: string;
      name?: string;
    } | null;
  }>;
};

type CategoriesResponse = {
  success?: boolean;
  data?: Array<{
    id?: string;
    name?: string;
    icon?: string | null;
  }>;
};

const queryParamKeys = {
  dashboard: {
    option: 'dashboardRange',
    month: 'dashboardMonth',
    year: 'dashboardYear',
    start: 'dashboardStartDay',
    end: 'dashboardEndDay',
    legacy: {
      option: 'dOpt',
      month: 'dM',
      year: 'dY',
      start: 'dS',
      end: 'dE',
    },
  },
  sales: {
    option: 'salesRange',
    month: 'salesMonth',
    year: 'salesYear',
    start: 'salesStartDay',
    end: 'salesEndDay',
    legacy: {
      option: 'sOpt',
      month: 'sM',
      year: 'sY',
      start: 'sS',
      end: 'sE',
    },
  },
  leds: {
    option: 'leadsRange',
    month: 'leadsMonth',
    year: 'leadsYear',
    start: 'leadsStartDay',
    end: 'leadsEndDay',
    legacy: {
      option: 'lOpt',
      month: 'lM',
      year: 'lY',
      start: 'lS',
      end: 'lE',
    },
  },
  productStock: {
    stage: 'stockStage',
    category: 'stockCategory',
    search: 'stockSearch',
  },
} as const;

function getFirstQueryValue(searchParams: Pick<URLSearchParams, 'get'>, ...keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null) return value;
  }

  return null;
}

const summaryCards = [
  { key: 'orders', color: 'bg-gradient-to-br from-orange-500 to-orange-600', label: '02', caption: 'Total Order', icon: ShoppingCart },
  { key: 'salesTarget', color: 'bg-gradient-to-br from-emerald-500 to-emerald-600', label: '10', caption: 'Sales Target', icon: WalletCards },
  { key: 'monthlySales', color: 'bg-gradient-to-br from-sky-500 to-cyan-600', label: '2,50,000 TK', caption: 'Monthly Sales', icon: BarChart3 },
  { key: 'monthlyExpenses', color: 'bg-gradient-to-br from-pink-500 to-rose-600', label: '3,50,000 TK', caption: 'Monthly Expenses', icon: WalletCards },
] as const;

const quickActions = [
  { key: 'create-sales' as SellerView, icon: ShoppingCart, labelKey: 'seller.createSales', color: 'text-green-600' },
  { key: 'customer-leds' as SellerView, icon: Users, labelKey: 'seller.customerLeds', color: 'text-cyan-500' },
  { key: 'product-stock' as SellerView, icon: PackageCheck, labelKey: 'seller.productStock', color: 'text-blue-700' },
  { key: 'attendance' as SellerView, icon: CalendarClock, labelKey: 'seller.attendance', color: 'text-orange-500' },
  { key: 'monthly-report' as SellerView, icon: BarChart3, labelKey: 'seller.monthlyReport', color: 'text-pink-500' },
  { key: 'personal-note' as SellerView, icon: NotebookPen, labelKey: 'seller.personalNote', color: 'text-purple-600' },
] as const;

const dateOptions: DateRangeOption[] = [
  'Today',
  'Yesterday',
  'Today and yesterday',
  'Last 7 days',
  'Last 14 days',
  'Last 28 days',
  'Last 30 days',
  'This week',
  'Last week',
  'This month',
  'Last month',
  'Maximum',
  'Custom',
];

const fallbackInventory: InventoryItem[] = [
  { code: 'A450', name: '2D Wallpaper Premium S4', stock: 50, category: 'Wallpaper' },
  { code: 'B102', name: 'Roman Blinds Classic', stock: 40, category: 'Blinds' },
  { code: 'C820', name: 'Curtain Drapes Velvet', stock: 35, category: 'Curtain' },
  { code: 'D211', name: 'Wall Decor Floral Roll', stock: 22, category: 'Wallpaper' },
  { code: 'E667', name: 'Premium Runner Carpet', stock: 18, category: 'Carpet' },
  { code: 'F310', name: 'Elegant Sheer Curtain', stock: 12, category: 'Curtain' },
  { code: 'CP-001', name: 'Luxury Wool Carpet', stock: 20, category: 'Carpet' },
  { code: 'WP-001', name: 'Premium Floral Wallpaper', stock: 50, category: 'Wallpaper' },
  { code: 'BL-001', name: 'Roman Blinds - White', stock: 30, category: 'Blinds' },
  { code: 'LX-205', name: 'Textured Wall Panel', stock: 28, category: 'Wall Panel' },
  { code: 'CR-110', name: 'Classic Curtain Fabric', stock: 16, category: 'Curtain' },
];

const inventoryDemoAdditions: InventoryItem[] = [
  { code: 'DM-701', name: 'Velvet Blackout Curtain', stock: 24, category: 'Curtain' },
  { code: 'DM-702', name: 'Embossed Vinyl Wallpaper', stock: 32, category: 'Wallpaper' },
  { code: 'DM-703', name: 'Premium Zebra Blinds', stock: 27, category: 'Blinds' },
  { code: 'DM-704', name: 'Luxury Door Mat Set', stock: 19, category: 'Door Mat' },
  { code: 'DM-705', name: 'Decorative Wall Molding', stock: 14, category: 'Wall Panel' },
];

const fallbackSellerCategories: SellerCategoryItem[] = [
  { id: 'seller-cat-blinds', name: 'Blinds' },
  { id: 'seller-cat-carpet', name: 'Carpet' },
  { id: 'seller-cat-wallpaper', name: 'Wallpaper' },
  { id: 'seller-cat-curtain', name: 'Curtain' },
  { id: 'seller-cat-mat', name: 'Door Mat' },
  { id: 'seller-cat-panel', name: 'Wall Panel' },
];

const stockStripColors = ['bg-cyan-100', 'bg-rose-100', 'bg-amber-100', 'bg-violet-100', 'bg-emerald-100'] as const;

function createSeededRandom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRandom<T>(items: T[], random: () => number) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function selectRandomInventoryByCategory(items: InventoryItem[], seed: string, limit: number) {
  const random = createSeededRandom(seed);
  const groupedByCategory = new Map<string, InventoryItem[]>();

  for (const item of items) {
    const categoryKey = item.category?.trim() || 'General';
    const group = groupedByCategory.get(categoryKey) || [];
    group.push(item);
    groupedByCategory.set(categoryKey, group);
  }

  const orderedCategories = shuffleWithRandom(Array.from(groupedByCategory.keys()), random);
  const shuffledGroups = new Map<string, InventoryItem[]>();
  for (const category of orderedCategories) {
    shuffledGroups.set(category, shuffleWithRandom(groupedByCategory.get(category) || [], random));
  }

  const picked: InventoryItem[] = [];
  let hasRowsLeft = true;

  while (picked.length < limit && hasRowsLeft) {
    hasRowsLeft = false;
    for (const category of orderedCategories) {
      const group = shuffledGroups.get(category) || [];
      if (group.length === 0) continue;

      const nextItem = group.shift();
      if (nextItem) {
        picked.push(nextItem);
      }

      if (group.length > 0) {
        hasRowsLeft = true;
      }

      if (picked.length >= limit) {
        break;
      }
    }
  }

  if (picked.length < limit) {
    const remaining = shuffleWithRandom(
      Array.from(shuffledGroups.values()).flat(),
      random
    );
    picked.push(...remaining.slice(0, limit - picked.length));
  }

  return picked.slice(0, limit);
}

const salesStatusLabel: Record<SalesOrderStatus, string> = {
  pending: 'PENDING ORDER',
  processing: 'PROCESSING ORDER',
  delivery: 'COMPLETE DELIVERY',
  canceled: 'CANCELED ORDER',
  'customer-leds': 'CUSTOMER LEDS',
};

const salesStatusTextClass: Record<SalesOrderStatus, string> = {
  pending: 'text-amber-600',
  processing: 'text-blue-700',
  delivery: 'text-green-600',
  canceled: 'text-red-600',
  'customer-leds': 'text-cyan-600',
};

const salesStatusHoverClass: Record<SalesOrderStatus, string> = {
  pending: 'hover:bg-amber-50',
  processing: 'hover:bg-blue-50',
  delivery: 'hover:bg-green-50',
  canceled: 'hover:bg-red-50',
  'customer-leds': 'hover:bg-cyan-50',
};

const salesOrderSections: Array<{ key: SalesBoardStatus; label: string; titleClass: string }> = [
  { key: 'pending', label: 'PENDING ORDER', titleClass: 'text-amber-500' },
  { key: 'processing', label: 'PROCESSING ORDER', titleClass: 'text-blue-700' },
  { key: 'delivery', label: 'COMPLETE DELIVERY', titleClass: 'text-green-600' },
  { key: 'canceled', label: 'CANCELED ORDER', titleClass: 'text-red-600' },
];

const salesBoardStatuses: SalesBoardStatus[] = salesOrderSections.map((section) => section.key);
const ledsStatusOptions: SalesOrderStatus[] = ['customer-leds', ...salesBoardStatuses];
const salesFilterChips: Array<{ key: SalesFilterStatus; label: string }> = [
  { key: 'all', label: 'ALL' },
  ...salesOrderSections.map((section) => ({ key: section.key, label: salesStatusLabel[section.key] })),
];
const ledsFilterChips: Array<{ key: LedsFilterStatus; label: string }> = [
  { key: 'all', label: 'ALL' },
  ...ledsStatusOptions.map((status) => ({ key: status, label: salesStatusLabel[status] })),
];
const SALES_ORDERS_STORAGE_KEY = 'luxo-seller-sales-orders';
const LEDS_ORDERS_STORAGE_KEY = 'luxo-seller-leds-orders';
const ORDERS_CLEANUP_KEY = 'luxo-seller-old-orders-cleared-v1';

const fallbackSalesOrders: SalesOrder[] = [];

const fallbackLedsOrders: SalesOrder[] = [];

function formatDisplayName(name?: string) {
  return name?.trim() || 'Seller';
}

function toInputDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDisplayDateValue(inputDate: string) {
  if (!inputDate) return '';
  const [year, month, day] = inputDate.split('-');
  if (!year || !month || !day) return inputDate;
  return `${day}/${month}/${year}`;
}

function toInputDateFromDisplay(value: string) {
  const [day, month, year] = value.split('/');
  if (!day || !month || !year) return toInputDateValue(new Date());
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseDisplayDateToDate(value: string) {
  const [day, month, year] = value.split('/').map((part) => Number.parseInt(part, 10));
  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getMonthRange(monthIndex: number, year: number) {
  return {
    start: new Date(year, monthIndex, 1, 0, 0, 0, 0),
    end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
  };
}

function buildDateRange(option: DateRangeOption, monthIndex: number, year: number, customStartDay: number | null, customEndDay: number | null) {
  const today = new Date();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const safeTodayDay = Math.min(today.getDate(), daysInMonth);
  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIndex, daysInMonth, 23, 59, 59, 999);

  const fromDays = (startDay: number, endDay: number) => {
    const safeStart = Math.max(1, Math.min(startDay, daysInMonth));
    const safeEnd = Math.max(safeStart, Math.min(endDay, daysInMonth));
    return {
      start: new Date(year, monthIndex, safeStart, 0, 0, 0, 0),
      end: new Date(year, monthIndex, safeEnd, 23, 59, 59, 999),
    };
  };

  switch (option) {
    case 'Today':
      return fromDays(safeTodayDay, safeTodayDay);
    case 'Yesterday':
      return safeTodayDay > 1 ? fromDays(safeTodayDay - 1, safeTodayDay - 1) : null;
    case 'Today and yesterday':
      return fromDays(Math.max(1, safeTodayDay - 1), safeTodayDay);
    case 'Last 7 days':
      return fromDays(Math.max(1, daysInMonth - 6), daysInMonth);
    case 'Last 14 days':
      return fromDays(Math.max(1, daysInMonth - 13), daysInMonth);
    case 'Last 28 days':
      return fromDays(Math.max(1, daysInMonth - 27), daysInMonth);
    case 'Last 30 days':
      return fromDays(Math.max(1, daysInMonth - 29), daysInMonth);
    case 'This week': {
      const thisMonthToday = new Date(year, monthIndex, safeTodayDay);
      const weekStart = safeTodayDay - thisMonthToday.getDay();
      return fromDays(Math.max(1, weekStart), safeTodayDay);
    }
    case 'Last week': {
      const thisMonthToday = new Date(year, monthIndex, safeTodayDay);
      const thisWeekStart = Math.max(1, safeTodayDay - thisMonthToday.getDay());
      const lastWeekEnd = Math.max(1, thisWeekStart - 1);
      const lastWeekStart = Math.max(1, lastWeekEnd - 6);
      return fromDays(lastWeekStart, lastWeekEnd);
    }
    case 'This month':
      return { start: monthStart, end: monthEnd };
    case 'Last month':
      return { start: monthStart, end: monthEnd };
    case 'Custom':
      return fromDays(customStartDay ?? 1, customEndDay ?? customStartDay ?? daysInMonth);
    case 'Maximum':
      return { start: monthStart, end: monthEnd };
    default:
      return null;
  }
}

function filterOrdersByDateRange(orders: SalesOrder[], option: DateRangeOption, monthIndex: number, year: number, customStartDay: number | null, customEndDay: number | null) {
  const range = buildDateRange(option, monthIndex, year, customStartDay, customEndDay);
  if (!range) return orders;

  return orders.filter((order) => {
    const parsed = parseDisplayDateToDate(order.date);
    if (!parsed) return false;
    return parsed >= range.start && parsed <= range.end;
  });
}

function toDayBounds(range: { start: Date; end: Date } | null) {
  if (!range) {
    return null;
  }

  return {
    startDay: range.start.getDate(),
    endDay: range.end.getDate(),
  };
}

function generateSalesOrderId() {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KDJ-${timestampPart}-${randomPart}`;
}

function parseAmount(value: string) {
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSameSalesOrder(a: SalesOrder, b: SalesOrder) {
  return (
    a.orderId === b.orderId &&
    a.name === b.name &&
    a.mobile === b.mobile &&
    a.date === b.date &&
    a.status === b.status
  );
}

function formatAmountDisplay(value: number) {
  const hasFraction = !Number.isInteger(value);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTakaAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSalesTargetCount(value: number) {
  const normalized = Math.max(0, Math.min(99, Math.round(Number(value) || 0)));
  return String(normalized).padStart(2, '0');
}

function isSameMonthAndYear(date: Date, reference: Date) {
  return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isValidSalesOrderStatus(value: unknown): value is SalesOrderStatus {
  return value === 'pending' || value === 'processing' || value === 'delivery' || value === 'canceled' || value === 'customer-leds';
}

function normalizePersistedStatus(value: unknown): SalesOrderStatus | null {
  if (isValidSalesOrderStatus(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'lead' || normalized === 'leads' || normalized === 'customer-led' || normalized === 'customer-leds') {
    return 'customer-leds';
  }
  if (normalized === 'pending' || normalized === 'transferred') {
    return 'pending';
  }
  if (normalized === 'processing' || normalized === 'confirmed') {
    return 'processing';
  }
  if (
    normalized === 'delivery' ||
    normalized === 'done' ||
    normalized === 'completed' ||
    normalized === 'delivered' ||
    normalized === 'complete delivery' ||
    normalized.replace(/[\s_-]+/g, '') === 'completedelivery'
  ) {
    return 'delivery';
  }
  if (normalized === 'canceled' || normalized === 'cancelled' || normalized === 'cancel') {
    return 'canceled';
  }

  return null;
}

function normalizeDeliveryIndicatorState(value: unknown): DeliveryIndicatorState {
  if (value === 'done' || value === 'deny') {
    return value;
  }
  return 'pending';
}

function getIndicatorDotClass(channel: 'sms' | 'courier', state: DeliveryIndicatorState) {
  if (state === 'deny') {
    return 'bg-red-200 border-red-300';
  }
  if (state === 'done') {
    return channel === 'sms' ? 'bg-green-200 border-green-300' : 'bg-sky-200 border-sky-300';
  }
  return 'bg-slate-200 border-slate-300';
}

function parsePersistedOrders(rawValue: string | null, fallback: SalesOrder[]) {
  if (rawValue === null) return fallback;

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return fallback;

    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => {
        const status = normalizePersistedStatus(item.status);
        const orderId = typeof item.orderId === 'string' ? item.orderId.trim() : '';
        const name = typeof item.name === 'string'
          ? item.name.trim()
          : (typeof item.customerName === 'string' ? item.customerName.trim() : '');
        const mobile = typeof item.mobile === 'string'
          ? item.mobile.trim()
          : (typeof item.contact === 'string'
            ? item.contact.trim()
            : (typeof item.phone === 'string' ? item.phone.trim() : ''));
        const date = typeof item.date === 'string'
          ? item.date
          : (typeof item.orderDate === 'string' ? item.orderDate : toDisplayDateValue(toInputDateValue(new Date())));

        if (!orderId || !name || !mobile || !date || !status) {
          return null;
        }

        const contactType = item.contactType === 'mobile' || item.contactType === 'whatsapp' ? item.contactType : null;

        const normalizedOrder: SalesOrder = {
          orderId,
          name,
          mobile,
          date,
          status,
          smsState: normalizeDeliveryIndicatorState(item.smsState),
          courierState: normalizeDeliveryIndicatorState(item.courierState),
          ...(contactType ? { contactType } : {}),
          ...(typeof item.villageRoad === 'string' ? { villageRoad: item.villageRoad } : {}),
          ...(typeof item.policeStation === 'string' ? { policeStation: item.policeStation } : {}),
          ...(typeof item.district === 'string' ? { district: item.district } : {}),
          ...(typeof item.productsDetails === 'string' ? { productsDetails: item.productsDetails } : {}),
          ...(typeof item.subTotal === 'string' ? { subTotal: item.subTotal } : {}),
          ...(typeof item.discount === 'string' ? { discount: item.discount } : {}),
          ...(typeof item.totalTaka === 'string' ? { totalTaka: item.totalTaka } : {}),
          ...(typeof item.sampleImageName === 'string' ? { sampleImageName: item.sampleImageName } : {}),
          ...(typeof item.sampleImageUrl === 'string' ? { sampleImageUrl: item.sampleImageUrl } : {}),
        };

        return normalizedOrder;
      })
      .filter((item): item is SalesOrder => item !== null);
  } catch {
    return fallback;
  }
}

function mergePersistedOrders(serverRows: SalesOrder[], cachedRows: SalesOrder[]) {
  const serverOrderIds = new Set(serverRows.map((row) => row.orderId));
  const mergedByOrderId = new Map<string, SalesOrder>();

  for (const cachedRow of cachedRows) {
    mergedByOrderId.set(cachedRow.orderId, cachedRow);
  }

  for (const serverRow of serverRows) {
    const cachedRow = mergedByOrderId.get(serverRow.orderId);
    mergedByOrderId.set(serverRow.orderId, {
      ...(cachedRow || serverRow),
      ...serverRow,
      ...(cachedRow?.sampleImageUrl ? { sampleImageUrl: cachedRow.sampleImageUrl } : {}),
    });
  }

  return [...serverRows, ...cachedRows.filter((cachedRow) => !serverOrderIds.has(cachedRow.orderId))].map(
    (row) => mergedByOrderId.get(row.orderId) || row
  );
}

function replaceOrderByMatch(prev: SalesOrder[], sourceOrder: SalesOrder, nextOrder: SalesOrder) {
  const index = prev.findIndex((item) => isSameSalesOrder(item, sourceOrder));
  if (index < 0) return prev;
  const next = [...prev];
  next[index] = nextOrder;
  return next;
}

function upsertOrderById(prev: SalesOrder[], nextOrder: SalesOrder) {
  const index = prev.findIndex((item) => item.orderId === nextOrder.orderId);
  if (index < 0) return [nextOrder, ...prev];
  const next = [...prev];
  next[index] = nextOrder;
  return next;
}

function removeOrderByMatch(prev: SalesOrder[], order: SalesOrder) {
  const index = prev.findIndex((item) => isSameSalesOrder(item, order));
  if (index < 0) return prev;
  const next = [...prev];
  next.splice(index, 1);
  return next;
}

function iconForAction(key: string) {
  switch (key) {
    case 'create-sales':
      return <ShoppingCart className="h-8 w-8" />;
    case 'customer-leds':
      return <Users className="h-8 w-8" />;
    case 'product-stock':
      return <PackageCheck className="h-8 w-8" />;
    case 'attendance':
      return <CalendarClock className="h-8 w-8" />;
    case 'monthly-report':
      return <BarChart3 className="h-8 w-8" />;
    case 'personal-note':
      return <NotebookPen className="h-8 w-8" />;
    default:
      return <ShoppingCart className="h-8 w-8" />;
  }
}

function getPlaceholderTitle(view: SellerView) {
  switch (view) {
    case 'create-sales':
      return 'Create Sale';
    case 'customer-leds':
      return 'Customer Leds';
    case 'product-stock':
      return 'Product & Stock';
    case 'attendance':
      return 'Attendance';
    case 'monthly-report':
      return 'Monthly Report';
    case 'personal-note':
      return 'Personal Note';
    case 'profile':
      return 'Seller Profile';
    default:
      return 'Seller Dashboard';
  }
}

function mergeIndicatorStates(previousRows: SalesOrder[], incomingRows: SalesOrder[]) {
  const incomingMap = new Map(
    incomingRows.map((row) => [
      row.orderId,
      {
        smsState: normalizeDeliveryIndicatorState(row.smsState),
        courierState: normalizeDeliveryIndicatorState(row.courierState),
      },
    ])
  );

  return previousRows.map((row) => {
    const incoming = incomingMap.get(row.orderId);
    if (!incoming) return row;

    return {
      ...row,
      smsState: incoming.smsState,
      courierState: incoming.courierState,
    };
  });
}

function persistSellerOrders(salesOrders: SalesOrder[], ledsOrders: SalesOrder[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(SALES_ORDERS_STORAGE_KEY, JSON.stringify(salesOrders));
  window.localStorage.setItem(LEDS_ORDERS_STORAGE_KEY, JSON.stringify(ledsOrders));
}

export default function SellerDashboardHome() {
  const { t } = useTranslation();
  const { success, warning } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDate = useMemo(() => new Date(), []);
  const [activeView, setActiveView] = useState<SellerView>(() => {
    const initialView = searchParams.get('view');
    return isSellerView(initialView) ? initialView : 'home';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [productStockSearchTerm, setProductStockSearchTerm] = useState('');
  const [profile, setProfile] = useState({ name: '', image: '', sellerId: '' });
  const [sellerDefaults, setSellerDefaults] = useState({ salesTargetAmount: 0, monthlyExpensesAmount: 0 });
  const [inventory, setInventory] = useState<InventoryItem[]>(fallbackInventory);
  const [allInventoryProducts, setAllInventoryProducts] = useState<InventoryItem[]>(fallbackInventory);
  const [sellerCategories, setSellerCategories] = useState<SellerCategoryItem[]>(fallbackSellerCategories);
  const [selectedSellerCategoryId, setSelectedSellerCategoryId] = useState<string | null>(null);
  const [productStockStage, setProductStockStage] = useState<ProductStockStage>('categories');
  const [isStockNoteModalOpen, setIsStockNoteModalOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<InventoryItem | null>(null);
  const [selectedStockNoteCategory, setSelectedStockNoteCategory] = useState<StockNoteCategoryContext | null>(null);
  const [stockNoteText, setStockNoteText] = useState('');
  const [isDatePanelOpen, setIsDatePanelOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<SalesFilterStatus>('all');
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(fallbackSalesOrders);
  const [isSalesDatePanelOpen, setIsSalesDatePanelOpen] = useState(false);
  const [salesSelectedMonth, setSalesSelectedMonth] = useState(currentDate.getMonth());
  const [salesSelectedYear, setSalesSelectedYear] = useState(currentDate.getFullYear());
  const [ledsSearchTerm, setLedsSearchTerm] = useState('');
  const [ledsStatusFilter, setLedsStatusFilter] = useState<LedsFilterStatus>('all');
  const [ledsOrders, setLedsOrders] = useState<SalesOrder[]>(fallbackLedsOrders);
  const [isLedsDatePanelOpen, setIsLedsDatePanelOpen] = useState(false);
  const [ledsSelectedMonth, setLedsSelectedMonth] = useState(currentDate.getMonth());
  const [ledsSelectedYear, setLedsSelectedYear] = useState(currentDate.getFullYear());
  const [isCreateSalesModalOpen, setIsCreateSalesModalOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [activeSalesActionRow, setActiveSalesActionRow] = useState<string | null>(null);
  const [holdingSalesRow, setHoldingSalesRow] = useState<string | null>(null);
  const [holdingProductCard, setHoldingProductCard] = useState<string | null>(null);
  const [editingSalesOrder, setEditingSalesOrder] = useState<SalesOrder | null>(null);
  const [orderFlowType, setOrderFlowType] = useState<OrderFlowType>('sales');
  const [hasHydratedOrders, setHasHydratedOrders] = useState(false);
  const [ordersSyncState, setOrdersSyncState] = useState<OrdersSyncState>('loading');
  const [indicatorRefreshLoading, setIndicatorRefreshLoading] = useState(false);
  const [lastIndicatorRefreshAt, setLastIndicatorRefreshAt] = useState<number | null>(null);
  const createSalesScrollTopRef = useRef(0);
  const stockNotes = useCommunicationStore((state) => state.stockNotes);
  const upsertStockNote = useCommunicationStore((state) => state.upsertStockNote);
  const clearStockNote = useCommunicationStore((state) => state.clearStockNote);
  const sendNotification = useCommunicationStore((state) => state.sendNotification);
  const dashboardDateSelection = useDatePanelSelection('Today');
  const salesDateSelection = useDatePanelSelection('Today');
  const ledsDateSelection = useDatePanelSelection('Today');
  const [createSalesForm, setCreateSalesForm] = useState<CreateSalesFormState>({
    status: 'pending',
    orderDate: toInputDateValue(currentDate),
    orderId: generateSalesOrderId(),
    customerName: '',
    contactType: 'mobile',
    contactValue: '',
    villageRoad: '',
    policeStation: '',
    district: '',
    productsDetails: '',
    subTotal: '',
    discount: '',
    totalTaka: '',
    sampleImageName: '',
    sampleImageUrl: '',
  });
  const displayName = formatDisplayName(profile.name);
  const salesSampleInputRef = useRef<HTMLInputElement>(null);
  const salesStatusDropdownRef = useRef<HTMLDivElement>(null);
  const dashboardDateToggleRef = useRef<HTMLButtonElement>(null);
  const dashboardDatePanelRef = useRef<HTMLDivElement>(null);
  const globalSearchContainerRef = useRef<HTMLDivElement>(null);
  const orderListDateToggleRef = useRef<HTMLButtonElement>(null);
  const orderListDatePanelRef = useRef<HTMLDivElement>(null);
  const salesLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedOrdersSnapshotRef = useRef<string | null>(null);
  const syncIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ordersSyncRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    dateRangeOption: dashboardDateRangeOption,
    setDateRangeOption: setDashboardDateRangeOption,
    customStartDay: dashboardCustomStartDay,
    customEndDay: dashboardCustomEndDay,
    setCustomStartDay: setDashboardCustomStartDay,
    setCustomEndDay: setDashboardCustomEndDay,
    handleCustomDaySelect: handleDashboardCustomDaySelect,
  } = dashboardDateSelection;

  const {
    dateRangeOption: salesDateRangeOption,
    setDateRangeOption: setSalesDateRangeOption,
    customStartDay: salesCustomStartDay,
    customEndDay: salesCustomEndDay,
    setCustomStartDay: setSalesCustomStartDay,
    setCustomEndDay: setSalesCustomEndDay,
    handleCustomDaySelect: handleSalesCustomDaySelect,
  } = salesDateSelection;

  const {
    dateRangeOption: ledsDateRangeOption,
    setDateRangeOption: setLedsDateRangeOption,
    customStartDay: ledsCustomStartDay,
    customEndDay: ledsCustomEndDay,
    setCustomStartDay: setLedsCustomStartDay,
    setCustomEndDay: setLedsCustomEndDay,
    handleCustomDaySelect: handleLedsCustomDaySelect,
  } = ledsDateSelection;

  const parseQueryNumber = (value: string | null) => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseQueryOption = (value: string | null): DateRangeOption | null => {
    if (!value) return null;
    return dateOptions.includes(value as DateRangeOption) ? (value as DateRangeOption) : null;
  };

  useEffect(() => {
    const queryView = searchParams.get('view');
    const nextView = isSellerView(queryView) ? queryView : 'home';

    setActiveView((prev) => (prev === nextView ? prev : nextView));

    const querySalesStatus = searchParams.get('salesStatus');
    const nextSalesStatus = querySalesStatus && querySalesStatus !== 'all' && salesBoardStatuses.includes(querySalesStatus as SalesBoardStatus)
      ? (querySalesStatus as SalesBoardStatus)
      : 'all';

    setSalesStatusFilter((prev) => (prev === nextSalesStatus ? prev : nextSalesStatus));

    const queryDashboardOption = parseQueryOption(getFirstQueryValue(searchParams, queryParamKeys.dashboard.option, queryParamKeys.dashboard.legacy.option));
    if (queryDashboardOption) setDashboardDateRangeOption(queryDashboardOption);
    const queryDashboardMonth = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.dashboard.month, queryParamKeys.dashboard.legacy.month));
    const queryDashboardYear = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.dashboard.year, queryParamKeys.dashboard.legacy.year));
    const queryDashboardStart = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.dashboard.start, queryParamKeys.dashboard.legacy.start));
    const queryDashboardEnd = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.dashboard.end, queryParamKeys.dashboard.legacy.end));
    if (queryDashboardMonth !== null && queryDashboardMonth >= 0 && queryDashboardMonth <= 11) setSelectedMonth(queryDashboardMonth);
    if (queryDashboardYear !== null && queryDashboardYear >= 2000 && queryDashboardYear <= 2100) setSelectedYear(queryDashboardYear);
    setDashboardCustomStartDay(queryDashboardStart);
    setDashboardCustomEndDay(queryDashboardEnd);

    const querySalesOption = parseQueryOption(getFirstQueryValue(searchParams, queryParamKeys.sales.option, queryParamKeys.sales.legacy.option));
    if (querySalesOption) setSalesDateRangeOption(querySalesOption);
    const querySalesMonth = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.sales.month, queryParamKeys.sales.legacy.month));
    const querySalesYear = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.sales.year, queryParamKeys.sales.legacy.year));
    const querySalesStart = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.sales.start, queryParamKeys.sales.legacy.start));
    const querySalesEnd = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.sales.end, queryParamKeys.sales.legacy.end));
    if (querySalesMonth !== null && querySalesMonth >= 0 && querySalesMonth <= 11) setSalesSelectedMonth(querySalesMonth);
    if (querySalesYear !== null && querySalesYear >= 2000 && querySalesYear <= 2100) setSalesSelectedYear(querySalesYear);
    setSalesCustomStartDay(querySalesStart);
    setSalesCustomEndDay(querySalesEnd);

    const queryLedsOption = parseQueryOption(getFirstQueryValue(searchParams, queryParamKeys.leds.option, queryParamKeys.leds.legacy.option));
    if (queryLedsOption) setLedsDateRangeOption(queryLedsOption);
    const queryLedsMonth = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.leds.month, queryParamKeys.leds.legacy.month));
    const queryLedsYear = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.leds.year, queryParamKeys.leds.legacy.year));
    const queryLedsStart = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.leds.start, queryParamKeys.leds.legacy.start));
    const queryLedsEnd = parseQueryNumber(getFirstQueryValue(searchParams, queryParamKeys.leds.end, queryParamKeys.leds.legacy.end));
    if (queryLedsMonth !== null && queryLedsMonth >= 0 && queryLedsMonth <= 11) setLedsSelectedMonth(queryLedsMonth);
    if (queryLedsYear !== null && queryLedsYear >= 2000 && queryLedsYear <= 2100) setLedsSelectedYear(queryLedsYear);
    setLedsCustomStartDay(queryLedsStart);
    setLedsCustomEndDay(queryLedsEnd);

    const queryStockStage = searchParams.get(queryParamKeys.productStock.stage);
    const nextStockStage: ProductStockStage = queryStockStage === 'products' ? 'products' : 'categories';
    setProductStockStage((prev) => (prev === nextStockStage ? prev : nextStockStage));

    const queryStockCategory = searchParams.get(queryParamKeys.productStock.category);
    setSelectedSellerCategoryId((prev) => {
      const next = queryStockCategory || null;
      return prev === next ? prev : next;
    });

    const queryStockSearch = searchParams.get(queryParamKeys.productStock.search) || '';
    setProductStockSearchTerm((prev) => (prev === queryStockSearch ? prev : queryStockSearch));
  }, [
    searchParams,
    setDashboardCustomEndDay,
    setDashboardCustomStartDay,
    setDashboardDateRangeOption,
    setLedsCustomEndDay,
    setLedsCustomStartDay,
    setLedsDateRangeOption,
    setSalesCustomEndDay,
    setSalesCustomStartDay,
    setSalesDateRangeOption,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentViewValue = searchParams.get('view') || 'home';
    if (currentViewValue !== activeView) {
      if (activeView === 'home') {
        params.delete('view');
      } else {
        params.set('view', activeView);
      }
    }

    const currentQueryValue = searchParams.get('salesStatus') || 'all';
    if (currentQueryValue !== salesStatusFilter) {
      if (salesStatusFilter === 'all') {
        params.delete('salesStatus');
      } else {
        params.set('salesStatus', salesStatusFilter);
      }
    }

    params.set(queryParamKeys.dashboard.option, dashboardDateRangeOption);
    params.set(queryParamKeys.dashboard.month, String(selectedMonth));
    params.set(queryParamKeys.dashboard.year, String(selectedYear));
    if (dashboardCustomStartDay === null) {
      params.delete(queryParamKeys.dashboard.start);
    } else {
      params.set(queryParamKeys.dashboard.start, String(dashboardCustomStartDay));
    }
    if (dashboardCustomEndDay === null) {
      params.delete(queryParamKeys.dashboard.end);
    } else {
      params.set(queryParamKeys.dashboard.end, String(dashboardCustomEndDay));
    }
    params.delete(queryParamKeys.dashboard.legacy.option);
    params.delete(queryParamKeys.dashboard.legacy.month);
    params.delete(queryParamKeys.dashboard.legacy.year);
    params.delete(queryParamKeys.dashboard.legacy.start);
    params.delete(queryParamKeys.dashboard.legacy.end);

    params.set(queryParamKeys.sales.option, salesDateRangeOption);
    params.set(queryParamKeys.sales.month, String(salesSelectedMonth));
    params.set(queryParamKeys.sales.year, String(salesSelectedYear));
    if (salesCustomStartDay === null) {
      params.delete(queryParamKeys.sales.start);
    } else {
      params.set(queryParamKeys.sales.start, String(salesCustomStartDay));
    }
    if (salesCustomEndDay === null) {
      params.delete(queryParamKeys.sales.end);
    } else {
      params.set(queryParamKeys.sales.end, String(salesCustomEndDay));
    }
    params.delete(queryParamKeys.sales.legacy.option);
    params.delete(queryParamKeys.sales.legacy.month);
    params.delete(queryParamKeys.sales.legacy.year);
    params.delete(queryParamKeys.sales.legacy.start);
    params.delete(queryParamKeys.sales.legacy.end);

    params.set(queryParamKeys.leds.option, ledsDateRangeOption);
    params.set(queryParamKeys.leds.month, String(ledsSelectedMonth));
    params.set(queryParamKeys.leds.year, String(ledsSelectedYear));
    if (ledsCustomStartDay === null) {
      params.delete(queryParamKeys.leds.start);
    } else {
      params.set(queryParamKeys.leds.start, String(ledsCustomStartDay));
    }
    if (ledsCustomEndDay === null) {
      params.delete(queryParamKeys.leds.end);
    } else {
      params.set(queryParamKeys.leds.end, String(ledsCustomEndDay));
    }
    params.delete(queryParamKeys.leds.legacy.option);
    params.delete(queryParamKeys.leds.legacy.month);
    params.delete(queryParamKeys.leds.legacy.year);
    params.delete(queryParamKeys.leds.legacy.start);
    params.delete(queryParamKeys.leds.legacy.end);

    if (productStockStage === 'categories') {
      params.delete(queryParamKeys.productStock.stage);
    } else {
      params.set(queryParamKeys.productStock.stage, productStockStage);
    }

    if (selectedSellerCategoryId) {
      params.set(queryParamKeys.productStock.category, selectedSellerCategoryId);
    } else {
      params.delete(queryParamKeys.productStock.category);
    }

    if (productStockSearchTerm.trim()) {
      params.set(queryParamKeys.productStock.search, productStockSearchTerm);
    } else {
      params.delete(queryParamKeys.productStock.search);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [
    activeView,
    dashboardCustomEndDay,
    dashboardCustomStartDay,
    dashboardDateRangeOption,
    ledsCustomEndDay,
    ledsCustomStartDay,
    ledsDateRangeOption,
    ledsSelectedMonth,
    ledsSelectedYear,
    pathname,
    productStockSearchTerm,
    productStockStage,
    router,
    salesCustomEndDay,
    salesCustomStartDay,
    salesDateRangeOption,
    salesSelectedMonth,
    salesSelectedYear,
    searchParams,
    selectedSellerCategoryId,
    salesStatusFilter,
    selectedMonth,
    selectedYear,
  ]);

  const updateOrdersSyncState = (nextState: OrdersSyncState) => {
    setOrdersSyncState(nextState);
    if (syncIndicatorTimerRef.current) {
      clearTimeout(syncIndicatorTimerRef.current);
    }
    if (nextState === 'saved') {
      syncIndicatorTimerRef.current = setTimeout(() => {
        setOrdersSyncState('idle');
      }, 700);
    }
  };

  const refreshDeliveryIndicators = useCallback(async (silent = false) => {
    if (!silent) {
      setIndicatorRefreshLoading(true);
    }

    try {
        const response = await fetch('/api/seller/orders', { cache: 'no-store', credentials: 'include' });
      const payload = (await response.json()) as SellerOrdersResponse;

      if (!response.ok || !payload?.success) {
        return;
      }

      const incomingSales = Array.isArray(payload.data?.salesOrders)
        ? (payload.data?.salesOrders as SalesOrder[])
        : [];
      const incomingLeds = Array.isArray(payload.data?.ledsOrders)
        ? (payload.data?.ledsOrders as SalesOrder[])
        : [];

      setSalesOrders((prev) => mergeIndicatorStates(prev, incomingSales));
      setLedsOrders((prev) => mergeIndicatorStates(prev, incomingLeds));
      setLastIndicatorRefreshAt(Date.now());
    } catch {
      // Keep UI state untouched for transient refresh failures.
    } finally {
      if (!silent) {
        setIndicatorRefreshLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const persistedSalesOrders = parsePersistedOrders(window.localStorage.getItem(SALES_ORDERS_STORAGE_KEY), fallbackSalesOrders);
    const persistedLedsOrders = parsePersistedOrders(window.localStorage.getItem(LEDS_ORDERS_STORAGE_KEY), fallbackLedsOrders);
    setSalesOrders(persistedSalesOrders);
    setLedsOrders(persistedLedsOrders);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOrdersFromServer() {
      try {
        const alreadyCleared = window.localStorage.getItem(ORDERS_CLEANUP_KEY) === 'done';
        if (!alreadyCleared) {
          // Keep historical local/server rows intact. The cleanup flag is now only a migration marker.
          window.localStorage.setItem(ORDERS_CLEANUP_KEY, 'done');
        }

        const response = await fetch('/api/seller/orders', { cache: 'no-store', credentials: 'include' });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as SellerOrdersResponse;
        if (!payload.success) {
          return;
        }

        const serverSales = Array.isArray(payload.data?.salesOrders) ? payload.data?.salesOrders : [];
        const serverLeds = Array.isArray(payload.data?.ledsOrders) ? payload.data?.ledsOrders : [];
        const cachedSales = parsePersistedOrders(window.localStorage.getItem(SALES_ORDERS_STORAGE_KEY), []);
        const cachedLeds = parsePersistedOrders(window.localStorage.getItem(LEDS_ORDERS_STORAGE_KEY), []);
        const mergedSales = mergePersistedOrders(serverSales as SalesOrder[], cachedSales as SalesOrder[]);
        const mergedLeds = mergePersistedOrders(serverLeds as SalesOrder[], cachedLeds as SalesOrder[]);

        if (cancelled) return;

        setSalesOrders(mergedSales as SalesOrder[]);
        setLedsOrders(mergedLeds as SalesOrder[]);
        lastSyncedOrdersSnapshotRef.current = JSON.stringify({ salesOrders: serverSales, ledsOrders: serverLeds });
      } catch {
        if (!cancelled) {
          const persistedSalesOrders = parsePersistedOrders(window.localStorage.getItem(SALES_ORDERS_STORAGE_KEY), fallbackSalesOrders);
          const persistedLedsOrders = parsePersistedOrders(window.localStorage.getItem(LEDS_ORDERS_STORAGE_KEY), fallbackLedsOrders);
          setSalesOrders(persistedSalesOrders);
          setLedsOrders(persistedLedsOrders);
          lastSyncedOrdersSnapshotRef.current = null;
        }
      } finally {
        if (!cancelled) {
          updateOrdersSyncState('idle');
          setHasHydratedOrders(true);
        }
      }
    }

    loadOrdersFromServer();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedOrders) return;
    window.localStorage.setItem(SALES_ORDERS_STORAGE_KEY, JSON.stringify(salesOrders));
  }, [hasHydratedOrders, salesOrders]);

  useEffect(() => {
    if (!hasHydratedOrders) return;
    window.localStorage.setItem(LEDS_ORDERS_STORAGE_KEY, JSON.stringify(ledsOrders));
  }, [hasHydratedOrders, ledsOrders]);

  const pushSellerOrdersToServer = async (nextSalesOrders: SalesOrder[], nextLedsOrders: SalesOrder[]) => {
    try {
      const response = await fetch('/api/seller/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ salesOrders: nextSalesOrders, ledsOrders: nextLedsOrders }),
      });

      if (response.ok) {
        lastSyncedOrdersSnapshotRef.current = JSON.stringify({ salesOrders: nextSalesOrders, ledsOrders: nextLedsOrders });
        updateOrdersSyncState('saved');
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!hasHydratedOrders) return;

    const snapshot = JSON.stringify({ salesOrders, ledsOrders });
    if (snapshot === lastSyncedOrdersSnapshotRef.current) {
      return;
    }

    let cancelled = false;

    const clearRetryTimer = () => {
      if (ordersSyncRetryTimerRef.current) {
        clearTimeout(ordersSyncRetryTimerRef.current);
        ordersSyncRetryTimerRef.current = null;
      }
    };

    const syncOrders = async (attempt: number) => {
      if (cancelled) return;

      try {
        updateOrdersSyncState('syncing');
        const response = await fetch('/api/seller/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ salesOrders, ledsOrders }),
        });

        if (!response.ok) {
          updateOrdersSyncState('idle');

          const cappedAttempt = Math.min(attempt, 4);
          const baseDelay = Math.min(8000, 1200 * 2 ** cappedAttempt);
          const jitter = Math.floor(Math.random() * 300);

          clearRetryTimer();
          ordersSyncRetryTimerRef.current = setTimeout(() => {
            void syncOrders(cappedAttempt + 1);
          }, baseDelay + jitter);
          return;
        }

        clearRetryTimer();
        lastSyncedOrdersSnapshotRef.current = snapshot;
        updateOrdersSyncState('saved');
      } catch {
        if (cancelled) return;

        updateOrdersSyncState('idle');

        const cappedAttempt = Math.min(attempt, 4);
        const baseDelay = Math.min(8000, 1200 * 2 ** cappedAttempt);
        const jitter = Math.floor(Math.random() * 300);

        clearRetryTimer();
        ordersSyncRetryTimerRef.current = setTimeout(() => {
          void syncOrders(cappedAttempt + 1);
        }, baseDelay + jitter);
      }
    };

    const syncTimer = setTimeout(() => {
      void syncOrders(0);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(syncTimer);
      clearRetryTimer();
    };
  }, [hasHydratedOrders, ledsOrders, salesOrders]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!isGlobalSearchOpen) return;
      if (globalSearchContainerRef.current?.contains(event.target as Node)) return;
      setIsGlobalSearchOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isGlobalSearchOpen]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!salesStatusDropdownRef.current?.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const isLedsView = activeView === 'customer-leds';
      const isPanelOpen = isLedsView ? isLedsDatePanelOpen : isSalesDatePanelOpen;
      if (!isPanelOpen) return;
      const target = event.target as Node;
      if (orderListDatePanelRef.current?.contains(target)) return;
      if (orderListDateToggleRef.current?.contains(target)) return;
      if (isLedsView) {
        setIsLedsDatePanelOpen(false);
      } else {
        setIsSalesDatePanelOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [activeView, isLedsDatePanelOpen, isSalesDatePanelOpen]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!isDatePanelOpen) return;
      const target = event.target as Node;
      if (dashboardDatePanelRef.current?.contains(target)) return;
      if (dashboardDateToggleRef.current?.contains(target)) return;
      setIsDatePanelOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isDatePanelOpen]);

  useEffect(() => {
    const hasAnyAmount = createSalesForm.subTotal.trim() !== '' || createSalesForm.discount.trim() !== '';
    const subTotal = parseAmount(createSalesForm.subTotal);
    const discount = parseAmount(createSalesForm.discount);
    const total = Math.max(subTotal - discount, 0);
    const formattedTotal = hasAnyAmount ? formatAmountDisplay(total) : '';

    setCreateSalesForm((prev) => {
      if (prev.totalTaka === formattedTotal) {
        return prev;
      }
      return { ...prev, totalTaka: formattedTotal };
    });
  }, [createSalesForm.subTotal, createSalesForm.discount]);

  useEffect(() => {
    return () => {
      if (salesLongPressTimerRef.current) {
        clearTimeout(salesLongPressTimerRef.current);
      }
      if (productLongPressTimerRef.current) {
        clearTimeout(productLongPressTimerRef.current);
      }
      if (syncIndicatorTimerRef.current) {
        clearTimeout(syncIndicatorTimerRef.current);
      }
      if (ordersSyncRetryTimerRef.current) {
        clearTimeout(ordersSyncRetryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        let sellerRandomKey = 'seller-random';

        const [profileResponse, productsResponse, categoriesResponse] = await Promise.allSettled([
          fetch('/api/seller/profile', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/products?limit=30', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/categories', { cache: 'no-store', signal: controller.signal }),
        ]);

        if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
          const payload = (await profileResponse.value.json()) as SellerProfileResponse;
          setProfile({
            name: payload.data?.name || '',
            image: payload.data?.image || '',
            sellerId: payload.data?.sellerId || payload.data?.employeeCode || payload.data?.id || '',
          });
          setSellerDefaults({
            salesTargetAmount: Number(payload.data?.salesTargetAmount) || 0,
            monthlyExpensesAmount: Number(payload.data?.monthlyExpensesAmount) || 0,
          });
          sellerRandomKey =
            payload.data?.sellerId ||
            payload.data?.employeeCode ||
            payload.data?.id ||
            payload.data?.email ||
            'seller-random';
        }

        if (productsResponse.status === 'fulfilled' && productsResponse.value.ok) {
          const payload = (await productsResponse.value.json()) as ProductsResponse;
          const rows = payload.data ?? [];

          const mappedRows = rows.map((item, index) => ({
            code: item.sku || `A45${index}`,
            name: item.name || 'Unnamed Product',
            stock: Number(item.quantity) || 0,
            image: item.imageUrl || null,
            category: item.category?.name || 'General',
          }));

          const mergedRows = [...mappedRows, ...inventoryDemoAdditions, ...fallbackInventory]
            .filter((item, index, self) => self.findIndex((row) => row.code === item.code) === index);

          setAllInventoryProducts(mergedRows);
          const randomSeed = `${sellerRandomKey}-${Date.now()}-${Math.random()}`;
          const randomizedRows = selectRandomInventoryByCategory(mergedRows, randomSeed, 10);
          setInventory(randomizedRows);
        }

        if (categoriesResponse.status === 'fulfilled' && categoriesResponse.value.ok) {
          const payload = (await categoriesResponse.value.json()) as CategoriesResponse;
          const rows = payload.data ?? [];
          const mappedCategories = rows
            .filter((item) => typeof item.id === 'string' && typeof item.name === 'string' && item.name.trim().length > 0)
            .map((item) => ({
              id: item.id as string,
              name: (item.name as string).trim(),
              icon: item.icon || null,
            }));

          const categories = mappedCategories.length > 0 ? mappedCategories : fallbackSellerCategories;
          setSellerCategories(categories);
          setSelectedSellerCategoryId((prev) => {
            if (prev && categories.some((item) => item.id === prev)) {
              return prev;
            }
            return categories[0]?.id || null;
          });
        }

      } catch {
        // Keep fallback data when API is unavailable.
      }
    }

    loadData();
    return () => controller.abort();
  }, []);

  const filteredInventory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return inventory;
    return inventory.filter(
      (item) => item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query)
    );
  }, [inventory, searchTerm]);

  const filteredSellerCategories = useMemo(() => {
    const query = productStockSearchTerm.trim().toLowerCase();
    if (!query) return sellerCategories;

    return sellerCategories.filter((item) => item.name.toLowerCase().includes(query));
  }, [productStockSearchTerm, sellerCategories]);

  const selectedSellerCategory = useMemo(
    () => sellerCategories.find((item) => item.id === selectedSellerCategoryId) || null,
    [sellerCategories, selectedSellerCategoryId]
  );

  const activeStockNotes = useMemo(
    () => stockNotes.filter((item) => !item.clearedAt),
    [stockNotes]
  );

  const stockNoteByProductCode = useMemo(() => {
    return activeStockNotes.reduce<Map<string, (typeof activeStockNotes)[number]>>((map, item) => {
      map.set(item.productCode, item);
      return map;
    }, new Map());
  }, [activeStockNotes]);

  const filteredCategoryProducts = useMemo(() => {
    const selectedCategoryName = selectedSellerCategory?.name?.trim().toLowerCase();
    if (!selectedCategoryName) return [];

    const searchQuery = productStockSearchTerm.trim().toLowerCase();
    return allInventoryProducts
      .filter((item) => {
        const itemCategory = item.category?.trim().toLowerCase() || 'general';
        const sameCategory = itemCategory === selectedCategoryName;
        const matchesSearch =
          !searchQuery ||
          item.name.toLowerCase().includes(searchQuery) ||
          item.code.toLowerCase().includes(searchQuery);

        return sameCategory && matchesSearch;
      })
      .sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        if (nameCompare !== 0) return nameCompare;
        return a.code.localeCompare(b.code, undefined, { sensitivity: 'base' });
      });
  }, [allInventoryProducts, productStockSearchTerm, selectedSellerCategory]);

  const resolveProductCategoryContext = (product: InventoryItem) => {
    const rawName = product.category?.trim() || selectedSellerCategory?.name || 'General';
    const matchedCategory = sellerCategories.find(
      (item) => item.name.trim().toLowerCase() === rawName.toLowerCase()
    );

    if (matchedCategory) {
      return {
        id: matchedCategory.id,
        name: matchedCategory.name,
      };
    }

    const fallbackId = `seller-cat-${rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'general'}`;
    return {
      id: fallbackId,
      name: rawName,
    };
  };

  const openStockNoteModal = (product: InventoryItem, categoryContext?: StockNoteCategoryContext) => {
    const resolvedCategory = categoryContext || resolveProductCategoryContext(product);

    setSelectedStockProduct(product);
    setSelectedStockNoteCategory(resolvedCategory);
    setStockNoteText(stockNoteByProductCode.get(product.code)?.note || '');
    setIsStockNoteModalOpen(true);
  };

  const closeStockNoteModal = () => {
    setIsStockNoteModalOpen(false);
    setSelectedStockProduct(null);
    setSelectedStockNoteCategory(null);
    setStockNoteText('');
  };

  const activeModalStockNote = selectedStockProduct
    ? stockNoteByProductCode.get(selectedStockProduct.code)
    : null;

  const handleSaveStockNote = () => {
    const product = selectedStockProduct;
    const category = selectedStockNoteCategory;
    const note = stockNoteText.trim();

    if (!product || !category) return;
    if (!note) {
      warning('Please write a note before saving.', 'Missing note');
      return;
    }

    upsertStockNote({
      productCode: product.code,
      productName: product.name,
      categoryId: category.id,
      categoryName: category.name,
      sellerId: profile.sellerId || 'SELLER',
      sellerName: displayName,
      note,
    });

    sendNotification({
      title: `Stock note: ${product.name}`,
      message: `${displayName} added a stock note for ${product.name} in ${category.name}.`,
      audience: 'admin',
    });

    success('Stock note saved and sent to admin.', 'Note saved');
    closeStockNoteModal();
  };

  const handleDeleteStockNote = () => {
    const product = selectedStockProduct;
    if (!product || !activeModalStockNote) {
      closeStockNoteModal();
      return;
    }

    clearStockNote({
      productCode: product.code,
      clearedBy: 'seller',
    });

    success('Stock note deleted.', 'Note removed');
    closeStockNoteModal();
  };

  const handleProductCardPressStart = (product: InventoryItem, cardKey: string) => {
    const categoryContext = resolveProductCategoryContext(product);

    if (productLongPressTimerRef.current) {
      clearTimeout(productLongPressTimerRef.current);
    }

    setHoldingProductCard(cardKey);
    productLongPressTimerRef.current = setTimeout(() => {
      openStockNoteModal(product, categoryContext);
      setHoldingProductCard(null);
      productLongPressTimerRef.current = null;
    }, 1000);
  };

  const handleProductCardPressEnd = () => {
    if (productLongPressTimerRef.current) {
      clearTimeout(productLongPressTimerRef.current);
      productLongPressTimerRef.current = null;
    }
    setHoldingProductCard(null);
  };

  const handleNavigateSellerView = (view: SellerView) => {
    if (view === 'product-stock') {
      setProductStockStage('categories');
      setProductStockSearchTerm('');
    }
    setActiveView(view);
  };

  const globalSellerSearchResults = useMemo(() => {
    const query = globalSearchTerm.trim().toLowerCase();
    if (!query) return [] as GlobalSellerSearchResult[];

    const results: GlobalSellerSearchResult[] = [];
    const seen = new Set<string>();
    const maxResults = 14;
    const maxPerGroup = 5;

    const addResult = (item: GlobalSellerSearchResult) => {
      if (results.length >= maxResults || seen.has(item.id)) return;
      seen.add(item.id);
      results.push(item);
    };

    const matches = (...values: Array<string | undefined>) =>
      values.some((value) => (value || '').toLowerCase().includes(query));

    const viewItems: Array<{ view: SellerView; label: string; keywords: string }> = [
      { view: 'home', label: getPlaceholderTitle('home'), keywords: 'dashboard home' },
      { view: 'create-sales', label: t('seller.createSales'), keywords: 'create sale orders' },
      { view: 'customer-leds', label: t('seller.customerLeds'), keywords: 'customer leads leds' },
      { view: 'product-stock', label: t('seller.productStock'), keywords: 'inventory product stock category' },
      { view: 'attendance', label: t('seller.attendance'), keywords: 'attendance' },
      { view: 'monthly-report', label: t('seller.monthlyReport'), keywords: 'monthly report' },
      { view: 'personal-note', label: t('seller.personalNote'), keywords: 'personal note memo' },
      { view: 'profile', label: getPlaceholderTitle('profile'), keywords: 'profile account seller' },
    ];

    viewItems.forEach((item) => {
      if (!matches(item.label, item.keywords, item.view)) return;
      addResult({
        id: `view-${item.view}`,
        type: 'view',
        label: item.label,
        description: 'Section',
        view: item.view,
      });
    });

    salesOrders
      .filter((item) => matches(item.orderId, item.name, item.mobile, item.productsDetails))
      .slice(0, maxPerGroup)
      .forEach((item) => {
        addResult({
          id: `sales-${item.orderId}`,
          type: 'sales',
          label: `${item.name} (${item.orderId})`,
          description: `Sales | ${item.mobile}`,
          queryValue: item.orderId,
        });
      });

    ledsOrders
      .filter((item) => matches(item.orderId, item.name, item.mobile, item.productsDetails))
      .slice(0, maxPerGroup)
      .forEach((item) => {
        addResult({
          id: `leds-${item.orderId}`,
          type: 'leds',
          label: `${item.name} (${item.orderId})`,
          description: `Leds | ${item.mobile}`,
          queryValue: item.orderId,
        });
      });

    sellerCategories
      .filter((item) => matches(item.name, item.id))
      .slice(0, maxPerGroup)
      .forEach((item) => {
        addResult({
          id: `category-${item.id}`,
          type: 'category',
          label: item.name,
          description: 'Category | Product Stock',
          categoryId: item.id,
          queryValue: item.name,
        });
      });

    allInventoryProducts
      .filter((item) => matches(item.name, item.code, item.category))
      .slice(0, maxPerGroup)
      .forEach((item) => {
        const categoryId = sellerCategories.find(
          (category) => category.name.trim().toLowerCase() === (item.category || '').trim().toLowerCase()
        )?.id;
        addResult({
          id: `product-${item.code}`,
          type: 'product',
          label: `${item.name} (${item.code})`,
          description: `Product${item.category ? ` | ${item.category}` : ''}`,
          categoryId,
          queryValue: item.code,
        });
      });

    return results;
  }, [allInventoryProducts, globalSearchTerm, ledsOrders, salesOrders, sellerCategories, t]);

  const handleSelectGlobalSearchResult = useCallback((result: GlobalSellerSearchResult) => {
    if (result.type === 'view' && result.view) {
      handleNavigateSellerView(result.view);
    } else if (result.type === 'sales') {
      setActiveView('create-sales');
      setSalesStatusFilter('all');
      setSalesSearchTerm(result.queryValue || '');
    } else if (result.type === 'leds') {
      setActiveView('customer-leds');
      setLedsStatusFilter('all');
      setLedsSearchTerm(result.queryValue || '');
    } else if (result.type === 'category') {
      setActiveView('product-stock');
      setProductStockStage('products');
      if (result.categoryId) {
        setSelectedSellerCategoryId(result.categoryId);
      }
      setProductStockSearchTerm('');
    } else if (result.type === 'product') {
      setActiveView('product-stock');
      setProductStockStage('products');
      if (result.categoryId) {
        setSelectedSellerCategoryId(result.categoryId);
      }
      setProductStockSearchTerm(result.queryValue || result.label);
    }

    setIsGlobalSearchOpen(false);
  }, []);

  const showGlobalSearchResults = isGlobalSearchOpen && globalSearchTerm.trim().length > 0;

  const visibleInventory = useMemo(() => filteredInventory.slice(0, 10), [filteredInventory]);

  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const salesCalendarDays = useMemo(() => buildCalendarDays(salesSelectedMonth, salesSelectedYear), [salesSelectedMonth, salesSelectedYear]);
  const ledsCalendarDays = useMemo(() => buildCalendarDays(ledsSelectedMonth, ledsSelectedYear), [ledsSelectedMonth, ledsSelectedYear]);

  const filteredSalesOrders = useMemo(() => {
    const query = salesSearchTerm.trim().toLowerCase();
    return salesOrders.filter((item) => {
      const matchesQuery = !query || item.orderId.toLowerCase().includes(query) || item.name.toLowerCase().includes(query) || item.mobile.includes(query);
      const matchesStatus = salesStatusFilter === 'all' || item.status === salesStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [salesOrders, salesSearchTerm, salesStatusFilter]);

  const dateFilteredSalesOrders = useMemo(
    () => filterOrdersByDateRange(filteredSalesOrders, salesDateRangeOption, salesSelectedMonth, salesSelectedYear, salesCustomStartDay, salesCustomEndDay),
    [filteredSalesOrders, salesDateRangeOption, salesSelectedMonth, salesSelectedYear, salesCustomStartDay, salesCustomEndDay]
  );

  const groupedSalesOrders = useMemo(() => {
    return salesOrderSections.reduce<Record<SalesBoardStatus, SalesOrder[]>>(
      (acc, section) => {
        acc[section.key] = dateFilteredSalesOrders.filter((item) => item.status === section.key);
        return acc;
      },
      {
        pending: [],
        processing: [],
        delivery: [],
        canceled: [],
      }
    );
  }, [dateFilteredSalesOrders]);

  const filteredLedsOrders = useMemo(() => {
    const query = ledsSearchTerm.trim().toLowerCase();
    return ledsOrders.filter((item) => {
      const matchesQuery = !query || item.orderId.toLowerCase().includes(query) || item.name.toLowerCase().includes(query) || item.mobile.includes(query);
      const matchesStatus = ledsStatusFilter === 'all' || item.status === ledsStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [ledsOrders, ledsSearchTerm, ledsStatusFilter]);

  const dateFilteredLedsOrders = useMemo(
    () => filterOrdersByDateRange(filteredLedsOrders, ledsDateRangeOption, ledsSelectedMonth, ledsSelectedYear, ledsCustomStartDay, ledsCustomEndDay),
    [filteredLedsOrders, ledsDateRangeOption, ledsSelectedMonth, ledsSelectedYear, ledsCustomStartDay, ledsCustomEndDay]
  );

  const visibleSalesSections = useMemo(
    () => (salesStatusFilter === 'all' ? salesOrderSections : salesOrderSections.filter((section) => section.key === salesStatusFilter)),
    [salesStatusFilter]
  );

  const salesPanelDateLabel = useMemo(() => {
    const date = new Date(salesSelectedYear, salesSelectedMonth, 1);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${weekday}- ${day}/${month}/${year}`;
  }, [salesSelectedMonth, salesSelectedYear]);

  const ledsPanelDateLabel = useMemo(() => {
    const date = new Date(ledsSelectedYear, ledsSelectedMonth, 1);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${weekday}- ${day}/${month}/${year}`;
  }, [ledsSelectedMonth, ledsSelectedYear]);

  const dashboardView = activeView === 'home';
  const orderListView = activeView === 'create-sales' || activeView === 'customer-leds';
  const productStockView = activeView === 'product-stock';
  const isCustomerLedsView = activeView === 'customer-leds';
  const currentOrdersSearchTerm = isCustomerLedsView ? ledsSearchTerm : salesSearchTerm;
  const setCurrentOrdersSearchTerm = isCustomerLedsView ? setLedsSearchTerm : setSalesSearchTerm;
  const currentDatePanelOpen = isCustomerLedsView ? isLedsDatePanelOpen : isSalesDatePanelOpen;
  const setCurrentDatePanelOpen = isCustomerLedsView ? setIsLedsDatePanelOpen : setIsSalesDatePanelOpen;
  const currentCalendarDays = isCustomerLedsView ? ledsCalendarDays : salesCalendarDays;
  const currentSelectedMonth = isCustomerLedsView ? ledsSelectedMonth : salesSelectedMonth;
  const currentSelectedYear = isCustomerLedsView ? ledsSelectedYear : salesSelectedYear;
  const currentDateRangeOption = isCustomerLedsView ? ledsDateRangeOption : salesDateRangeOption;
  const setCurrentDateRangeOption = isCustomerLedsView ? setLedsDateRangeOption : setSalesDateRangeOption;
  const currentCustomStartDay = isCustomerLedsView ? ledsCustomStartDay : salesCustomStartDay;
  const currentCustomEndDay = isCustomerLedsView ? ledsCustomEndDay : salesCustomEndDay;
  const currentPanelDateLabel = isCustomerLedsView ? ledsPanelDateLabel : salesPanelDateLabel;
  const currentFilterChips = isCustomerLedsView ? ledsFilterChips : salesFilterChips;
  const currentStatusFilter = isCustomerLedsView ? ledsStatusFilter : salesStatusFilter;
  const currentRangeButtonLabel = currentDateRangeOption === 'Custom' ? `${monthNames[currentSelectedMonth]} ${currentSelectedYear}` : currentDateRangeOption;
  const dashboardRangeButtonLabel = dashboardDateRangeOption === 'Custom' ? `${monthNames[selectedMonth]} ${selectedYear}` : dashboardDateRangeOption;

  const currentPanelDayBounds = useMemo(
    () => toDayBounds(buildDateRange(currentDateRangeOption, currentSelectedMonth, currentSelectedYear, currentCustomStartDay, currentCustomEndDay)),
    [currentDateRangeOption, currentSelectedMonth, currentSelectedYear, currentCustomStartDay, currentCustomEndDay]
  );
  const dashboardDayBounds = useMemo(
    () => toDayBounds(buildDateRange(dashboardDateRangeOption, selectedMonth, selectedYear, dashboardCustomStartDay, dashboardCustomEndDay)),
    [dashboardDateRangeOption, selectedMonth, selectedYear, dashboardCustomStartDay, dashboardCustomEndDay]
  );
  const isCurrentPanelMonth = currentSelectedMonth === currentDate.getMonth() && currentSelectedYear === currentDate.getFullYear();
  const isDashboardCurrentMonth = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();
  const todayDayOfMonth = currentDate.getDate();

  const dashboardSelectedOrders = useMemo(
    () => filterOrdersByDateRange(salesOrders, dashboardDateRangeOption, selectedMonth, selectedYear, dashboardCustomStartDay, dashboardCustomEndDay),
    [salesOrders, dashboardDateRangeOption, selectedMonth, selectedYear, dashboardCustomStartDay, dashboardCustomEndDay]
  );

  const dashboardSelectedActiveOrders = useMemo(
    () => dashboardSelectedOrders.filter((item) => item.status !== 'canceled' && item.status !== 'customer-leds'),
    [dashboardSelectedOrders]
  );

  const currentMonthOrders = useMemo(
    () => salesOrders.filter((order) => {
      const parsed = parseDisplayDateToDate(order.date);
      return parsed ? isSameMonthAndYear(parsed, currentDate) : false;
    }),
    [salesOrders, currentDate]
  );

  const currentMonthDeliveryAmount = useMemo(
    () => currentMonthOrders
      .filter((item) => item.status === 'delivery')
      .reduce((sum, item) => sum + parseAmount(item.totalTaka || '0'), 0),
    [currentMonthOrders]
  );

  const currentMonthCanceledAmount = useMemo(
    () => currentMonthOrders
      .filter((item) => item.status === 'canceled')
      .reduce((sum, item) => sum + parseAmount(item.totalTaka || '0'), 0),
    [currentMonthOrders]
  );

  const selectedTotalSaleAmount = useMemo(
    () => dashboardSelectedActiveOrders.reduce((sum, item) => sum + parseAmount(item.totalTaka || '0'), 0),
    [dashboardSelectedActiveOrders]
  );

  const currentMonthDeliverySummary = currentMonthDeliveryAmount;
  const currentMonthCanceledSummary = currentMonthCanceledAmount;
  const selectedTotalSaleSummary = selectedTotalSaleAmount;

  const dashboardSummaryCards = useMemo(() => {
    const totalOrders = dashboardSelectedActiveOrders.length;

    return summaryCards.map((card) => {
      if (card.key === 'orders') {
        return { ...card, label: String(totalOrders).padStart(2, '0') };
      }
      if (card.key === 'salesTarget') {
        return { ...card, label: formatSalesTargetCount(sellerDefaults.salesTargetAmount) };
      }
      if (card.key === 'monthlySales') {
        return { ...card, label: `${formatTakaAmount(currentMonthDeliveryAmount)} TK` };
      }
      if (card.key === 'monthlyExpenses') {
        return { ...card, label: `${formatTakaAmount(sellerDefaults.monthlyExpensesAmount)} TK` };
      }
      return card;
    });
  }, [currentMonthDeliveryAmount, dashboardSelectedActiveOrders.length, sellerDefaults.monthlyExpensesAmount, sellerDefaults.salesTargetAmount]);

  const closeCurrentDatePanel = () => {
    if (isCustomerLedsView) {
      setIsLedsDatePanelOpen(false);
    } else {
      setIsSalesDatePanelOpen(false);
    }
  };

  const handleCurrentCustomDaySelect = (day: number) => {
    if (isCustomerLedsView) {
      handleLedsCustomDaySelect(day);
      return;
    }

    handleSalesCustomDaySelect(day);
  };

  const headerAvatar = profile.image || '';

  const handleCreateSalesOrder = (source: OrderFlowType = 'sales') => {
    if (typeof window !== 'undefined') {
      createSalesScrollTopRef.current = window.scrollY;
    }

    setCreateSalesForm({
      status: source === 'leds' ? 'customer-leds' : 'pending',
      orderDate: toInputDateValue(new Date()),
      orderId: generateSalesOrderId(),
      customerName: '',
      contactType: 'mobile',
      contactValue: '',
      villageRoad: '',
      policeStation: '',
      district: '',
      productsDetails: '',
      subTotal: '',
      discount: '',
      totalTaka: '',
      sampleImageName: '',
      sampleImageUrl: '',
    });
    setOrderFlowType(source);
    setEditingSalesOrder(null);
    setIsStatusDropdownOpen(false);
    setIsCreateSalesModalOpen(true);
  };

  const handleCloseCreateSalesModal = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setEditingSalesOrder(null);
    setIsStatusDropdownOpen(false);
    setIsCreateSalesModalOpen(false);

    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: createSalesScrollTopRef.current, behavior: 'auto' });
      });
    }
  };

  const handleSalesRowPressStart = (rowKey: string) => {
    if (salesLongPressTimerRef.current) {
      clearTimeout(salesLongPressTimerRef.current);
    }

    setHoldingSalesRow(rowKey);

    salesLongPressTimerRef.current = setTimeout(() => {
      setActiveSalesActionRow(rowKey);
      setHoldingSalesRow(null);
    }, 2000);
  };

  const handleSalesRowPressEnd = () => {
    if (salesLongPressTimerRef.current) {
      clearTimeout(salesLongPressTimerRef.current);
      salesLongPressTimerRef.current = null;
    }
    setHoldingSalesRow(null);
  };

  const handleEditSalesOrder = (order: SalesOrder, source: OrderFlowType = 'sales') => {
    setCreateSalesForm({
      status: order.status,
      orderDate: toInputDateFromDisplay(order.date),
      orderId: order.orderId,
      customerName: order.name,
      contactType: order.contactType || 'mobile',
      contactValue: order.mobile,
      villageRoad: order.villageRoad || '',
      policeStation: order.policeStation || '',
      district: order.district || '',
      productsDetails: order.productsDetails || '',
      subTotal: order.subTotal || '',
      discount: order.discount || '',
      totalTaka: order.totalTaka || '',
      sampleImageName: order.sampleImageName || '',
      sampleImageUrl: order.sampleImageUrl || '',
    });
    setOrderFlowType(source);
    setEditingSalesOrder(order);
    setIsStatusDropdownOpen(false);
    setActiveSalesActionRow(null);
    setHoldingSalesRow(null);
    setIsCreateSalesModalOpen(true);
  };

  const handleDeleteSalesOrder = (order: SalesOrder, source: OrderFlowType = 'sales') => {
    const removeOrder = (prev: SalesOrder[]) => {
      const index = prev.findIndex((item) => isSameSalesOrder(item, order));
      if (index < 0) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    };

    if (source === 'leds') {
      setLedsOrders((prev) => {
        const next = removeOrder(prev);
        persistSellerOrders(salesOrders, next);
        return next;
      });
    } else {
      setSalesOrders((prev) => {
        const next = removeOrder(prev);
        persistSellerOrders(next, ledsOrders);
        return next;
      });
    }
    setActiveSalesActionRow(null);
    setHoldingSalesRow(null);
  };

  const handleDownloadSalesData = async (order: SalesOrder) => {
    const captureRoot = document.createElement('div');
    captureRoot.style.position = 'fixed';
    captureRoot.style.left = '-10000px';
    captureRoot.style.top = '0';
    captureRoot.style.width = '900px';
    captureRoot.style.background = '#ffffff';
    captureRoot.style.padding = '24px';
    captureRoot.style.border = '1px solid #e2e8f0';
    captureRoot.style.borderRadius = '16px';

    const sampleImageBlock = order.sampleImageUrl
      ? `<img src="${escapeHtml(order.sampleImageUrl)}" alt="Sample" style="width:100%;height:100%;object-fit:contain;border-radius:10px;background:#f8fafc;" />`
      : `<div style="display:flex;height:100%;width:100%;align-items:center;justify-content:center;color:#64748b;font-size:18px;background:#f8fafc;border-radius:10px;">No Sample Image</div>`;

    captureRoot.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid #e2e8f0;padding-bottom:14px;">
        <div>
          <h2 style="margin:0;font-size:30px;font-weight:800;color:#0f172a;">Customer Order Data</h2>
          <p style="margin:6px 0 0;font-size:14px;color:#64748b;">Luxo Seller Export</p>
        </div>
        <div style="position:relative;display:block;height:40px;min-width:170px;padding:0 16px;border-radius:999px;background:#fff7ed;border:1px solid #fdba74;color:#c2410c;font-size:14px;font-weight:700;text-align:center;white-space:nowrap;box-sizing:border-box;">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%, -50%);line-height:1;">${escapeHtml(salesStatusLabel[order.status])}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1.25fr 0.9fr;gap:20px;margin-top:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;"><p style="margin:0 0 4px;color:#64748b;font-size:12px;">Order ID</p><p style="margin:0;color:#0f172a;font-size:18px;font-weight:700;">${escapeHtml(order.orderId)}</p></div>
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;"><p style="margin:0 0 4px;color:#64748b;font-size:12px;">Date</p><p style="margin:0;color:#0f172a;font-size:18px;font-weight:700;">${escapeHtml(order.date)}</p></div>
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;"><p style="margin:0 0 4px;color:#64748b;font-size:12px;">Customer Name</p><p style="margin:0;color:#0f172a;font-size:18px;font-weight:700;">${escapeHtml(order.name)}</p></div>
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;"><p style="margin:0 0 4px;color:#64748b;font-size:12px;">Mobile</p><p style="margin:0;color:#0f172a;font-size:18px;font-weight:700;">${escapeHtml(order.mobile)}</p></div>
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;"><p style="margin:0 0 4px;color:#64748b;font-size:12px;">Village/Road</p><p style="margin:0;color:#0f172a;font-size:16px;font-weight:600;">${escapeHtml(order.villageRoad || '-')}</p></div>
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;"><p style="margin:0 0 4px;color:#64748b;font-size:12px;">Police Station / District</p><p style="margin:0;color:#0f172a;font-size:16px;font-weight:600;">${escapeHtml(order.policeStation || '-')}${order.district ? ` / ${escapeHtml(order.district)}` : ''}</p></div>
          <div style="grid-column:1 / -1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;overflow:hidden;"><p style="margin:0 0 4px;color:#64748b;font-size:12px;">Products Details</p><p style="margin:0;color:#0f172a;font-size:15px;line-height:1.45;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;max-width:100%;">${escapeHtml(order.productsDetails || '-')}</p></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="aspect-ratio:1 / 1;border:1px solid #e2e8f0;border-radius:12px;padding:6px;overflow:hidden;">
            ${sampleImageBlock}
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;display:grid;gap:8px;">
            <div style="display:flex;justify-content:space-between;color:#334155;"><span>Sub Total</span><strong>${escapeHtml(order.subTotal || '0')}</strong></div>
            <div style="display:flex;justify-content:space-between;color:#334155;"><span>Discount</span><strong>${escapeHtml(order.discount || '0')}</strong></div>
            <div style="height:1px;background:#e2e8f0;"></div>
            <div style="display:flex;justify-content:space-between;color:#0f172a;font-size:20px;"><span>Total Taka</span><strong>${escapeHtml(order.totalTaka || '0')}</strong></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(captureRoot);

    try {
      const canvas = await html2canvas(captureRoot, {
        scale: 2.2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `customer-order-${order.orderId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      document.body.removeChild(captureRoot);
      setActiveSalesActionRow(null);
      setHoldingSalesRow(null);
    }
  };

  const handleCreateSalesInput = (key: keyof CreateSalesFormState, value: string) => {
    setCreateSalesForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSalesSampleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCreateSalesForm((prev) => {
      if (prev.sampleImageUrl) {
        URL.revokeObjectURL(prev.sampleImageUrl);
      }
      return {
        ...prev,
        sampleImageName: file.name,
        sampleImageUrl: previewUrl,
      };
    });
    event.target.value = '';
  };

  const handleSubmitCreateSales = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const customerName = createSalesForm.customerName.trim();
    const contactValue = createSalesForm.contactValue.trim();

    if (!customerName || !contactValue) {
      return;
    }

    let orderId = createSalesForm.orderId.trim() || generateSalesOrderId();
    if (!editingSalesOrder) {
      const existingIds = new Set([...salesOrders, ...ledsOrders].map((item) => item.orderId));
      while (existingIds.has(orderId)) {
        orderId = generateSalesOrderId();
      }
    }
    const previousStatus = editingSalesOrder?.status;

    const selectedStatus = createSalesForm.status;
    const savedOrder: SalesOrder = {
      orderId,
      name: customerName,
      mobile: contactValue,
      date: toDisplayDateValue(createSalesForm.orderDate) || '01/02/2026',
      status: selectedStatus,
      smsState: editingSalesOrder?.smsState || 'pending',
      courierState: editingSalesOrder?.courierState || 'pending',
      contactType: createSalesForm.contactType,
      villageRoad: createSalesForm.villageRoad,
      policeStation: createSalesForm.policeStation,
      district: createSalesForm.district,
      productsDetails: createSalesForm.productsDetails,
      subTotal: createSalesForm.subTotal,
      discount: createSalesForm.discount,
      totalTaka: createSalesForm.totalTaka,
      sampleImageName: createSalesForm.sampleImageName,
      sampleImageUrl: createSalesForm.sampleImageUrl,
    };

    const targetFlowType: OrderFlowType = selectedStatus === 'customer-leds' ? 'leds' : 'sales';
    let nextSalesOrders = salesOrders;
    let nextLedsOrders = ledsOrders;

    if (editingSalesOrder) {
      if (orderFlowType === targetFlowType) {
        if (targetFlowType === 'leds') {
          const replaced = replaceOrderByMatch(nextLedsOrders, editingSalesOrder, savedOrder);
          nextLedsOrders = replaced === nextLedsOrders ? upsertOrderById(nextLedsOrders, savedOrder) : replaced;
        } else {
          const replaced = replaceOrderByMatch(nextSalesOrders, editingSalesOrder, savedOrder);
          nextSalesOrders = replaced === nextSalesOrders ? upsertOrderById(nextSalesOrders, savedOrder) : replaced;
        }
      } else if (orderFlowType === 'leds') {
        nextLedsOrders = removeOrderByMatch(nextLedsOrders, editingSalesOrder);
        nextSalesOrders = upsertOrderById(nextSalesOrders, savedOrder);
      } else {
        nextSalesOrders = removeOrderByMatch(nextSalesOrders, editingSalesOrder);
        nextLedsOrders = upsertOrderById(nextLedsOrders, savedOrder);
      }
    } else if (targetFlowType === 'leds') {
      nextLedsOrders = upsertOrderById(nextLedsOrders, savedOrder);
    } else {
      nextSalesOrders = upsertOrderById(nextSalesOrders, savedOrder);
    }

    setSalesOrders(nextSalesOrders);
    setLedsOrders(nextLedsOrders);
    persistSellerOrders(nextSalesOrders, nextLedsOrders);
    void pushSellerOrdersToServer(nextSalesOrders, nextLedsOrders);

    if (previousStatus && previousStatus !== selectedStatus) {
      success(`Moved to ${salesStatusLabel[selectedStatus]}.`, 'Status updated');
    }
    handleCloseCreateSalesModal();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-300">
      <AdminHeader
        onMenuClick={() => setSidebarOpen((prev) => !prev)}
        avatarImage={headerAvatar}
        avatarName={displayName}
        avatarRole="Seller"
        avatarRoleSub={dashboardView ? 'Dashboard' : getPlaceholderTitle(activeView)}
      />

      <SellerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={activeView}
        onNavigate={(view) => {
          handleNavigateSellerView(view);
          setSidebarOpen(false);
        }}
      />

      <main
        className="desktop-content-shell mx-auto w-full max-w-[1400px] px-3 pb-28 pt-[88px] transition-colors duration-300 lg:mx-0 lg:ml-64 lg:w-[calc(100%-16rem)] lg:max-w-none lg:px-5 lg:pt-[104px]"
        style={{ overflowAnchor: 'none' }}
      >
        {dashboardView ? (
          <>
            <div ref={globalSearchContainerRef} className="relative mt-0 mb-2 rounded-full border border-orange-300 bg-white px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-400">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={searchTerm}
                  onFocus={() => setIsGlobalSearchOpen(true)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearchTerm(value);
                    setGlobalSearchTerm(value);
                    setIsGlobalSearchOpen(true);
                  }}
                  placeholder={t('seller.searchPlaceholder')}
                  className="w-full bg-transparent text-[13px] font-light outline-none placeholder:font-light placeholder:text-slate-400 bangla-font"
                />
              </div>

              {showGlobalSearchResults ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {globalSellerSearchResults.length > 0 ? (
                    globalSellerSearchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectGlobalSearchResult(item)}
                        className="flex w-full items-start justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                          <span className="block truncate text-xs text-slate-500">{item.description}</span>
                        </span>
                        <span className="ml-3 shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                          {item.type}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center text-xs font-medium text-slate-500">
                      No matching data in seller panel.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <section className="rounded-[18px] border border-slate-200 bg-white px-4 pb-4 pt-2.5 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <h1 className="text-[19px] font-semibold uppercase tracking-tight text-orange-500 sm:text-[22px]">{t('seller.dashboard')}</h1>
                <button
                  ref={dashboardDateToggleRef}
                  type="button"
                  onClick={() => setIsDatePanelOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[15px] font-normal text-slate-700"
                >
                  {dashboardRangeButtonLabel}
                  <span className="text-xs">▼</span>
                </button>
              </div>

              <div className="relative mt-3">
                {isDatePanelOpen && (
                  <div ref={dashboardDatePanelRef} className="absolute left-0 top-0 z-20 w-full rounded-[16px] border border-slate-200 bg-white p-3 shadow-2xl">
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[620px] grid-cols-[170px_1fr] gap-4">
                        <div className="space-y-1 border-r border-slate-100 pr-4 text-sm text-slate-700">
                          {dateOptions.map((option) => (
                            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-slate-50">
                              <input
                                type="radio"
                                name="dateRange"
                                checked={dashboardDateRangeOption === option}
                                onChange={() => setDashboardDateRangeOption(option as DateRangeOption)}
                                className="accent-orange-500"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                        <div className="rounded-[14px] border border-slate-200 bg-white p-2">
                          <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1 text-slate-700">
                            <button type="button" className="text-2xl leading-none">‹</button>
                            <DatePanelPicker
                              monthIndex={selectedMonth}
                              year={selectedYear}
                              onMonthChange={setSelectedMonth}
                              onYearChange={setSelectedYear}
                            />
                            <button type="button" className="text-2xl leading-none">›</button>
                          </div>
                          <div className="grid grid-cols-7 gap-y-2 text-center text-[15px] text-slate-700">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                              <div key={day} className="py-1 font-medium">{day}</div>
                            ))}
                            {calendarDays.map((day, index) => (
                              <button
                                key={`${selectedYear}-${selectedMonth}-${index}`}
                                type="button"
                                disabled={!day}
                                onClick={() => {
                                  if (day) {
                                    handleDashboardCustomDaySelect(day);
                                  }
                                }}
                                className={`rounded-md py-2 ${!day
                                  ? 'cursor-default text-slate-300'
                                  : dashboardDayBounds && day >= dashboardDayBounds.startDay && day <= dashboardDayBounds.endDay
                                    ? 'bg-orange-500 font-semibold text-white'
                                    : isDashboardCurrentMonth && day === todayDayOfMonth
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'text-slate-900 hover:bg-slate-100'
                                }`}
                              >
                                {day ?? ''}
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-end gap-4 px-2 pb-1 text-sm">
                            <button type="button" className="text-slate-700" onClick={() => setIsDatePanelOpen(false)}>Cancel</button>
                            <button type="button" className="rounded-md bg-orange-500 px-4 py-2 text-white" onClick={() => setIsDatePanelOpen(false)}>Update</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full bg-white px-0 py-0">
                  <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-slate-200 text-center text-[14px] font-semibold text-slate-500 sm:grid-cols-3">
                    <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-1 sm:border-b-0">
                      <span className="whitespace-nowrap">
                        Total Delivery: <span className="text-[14px] font-semibold text-blue-600">৳{formatTakaAmount(currentMonthDeliverySummary)}</span>
                      </span>
                    </div>
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-1 sm:border-b-0">
                      <span className="whitespace-nowrap">
                        Total Canceled: <span className="text-[14px] font-semibold text-red-500">৳{formatTakaAmount(currentMonthCanceledSummary)}</span>
                      </span>
                    </div>
                    <div className="col-span-2 bg-white px-3 py-0.5 text-center sm:col-span-1">
                      <h2 className="whitespace-nowrap text-[19px] font-semibold sm:text-[24px]">
                        <span className="text-slate-800">Total Sale: </span>
                        <span className="text-[20px] font-semibold text-emerald-600 sm:text-[26px]">৳{formatTakaAmount(selectedTotalSaleSummary)}</span>
                      </h2>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {dashboardSummaryCards.map((card, index) => {
                      const Icon = card.icon;
                      const isAmountCard = card.key === 'monthlySales' || card.key === 'monthlyExpenses';
                      return (
                        <article key={card.key} className={`relative flex h-[88px] flex-col overflow-hidden rounded-[10px] px-3 py-1 text-white shadow-lg ${card.color}`}>
                          <div className="flex flex-1 items-center justify-between">
                            <div
                              className="grid h-8 w-10 place-items-center rounded-md bg-white/20 seller-summary-icon"
                              style={{ animationDelay: `${index * 0.2}s` }}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className={`ml-2 w-full text-right leading-none opacity-95 ${isAmountCard ? 'whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em] sm:text-[18px]' : 'text-[44px] font-semibold sm:text-[46px]'}`}>
                              {card.label}
                            </div>
                          </div>
                          <div className="mt-auto flex h-[22px] items-center justify-center border-t border-white/25 text-center text-[13px] font-semibold leading-none">{card.caption}</div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-2.5 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
              <div className="grid grid-cols-3 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => handleNavigateSellerView(action.key)}
                      className="seller-menu-hover group relative flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3.5 py-3 text-center shadow-sm transition-all duration-200 hover:border-slate-300 hover:from-white hover:to-slate-100 hover:shadow-md active:scale-[0.98]"
                    >
                      <span className={`${action.color} transition-transform duration-200 group-hover:-translate-y-0.5`}>{Icon ? iconForAction(action.key) : null}</span>
                      <span className="mt-2.5 whitespace-nowrap text-center text-[11px] font-semibold leading-none text-slate-700 bangla-font transition-colors duration-200 group-hover:text-orange-500">{t(action.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mt-2.5 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <h2 className="whitespace-nowrap text-[19px] font-semibold uppercase tracking-tight sm:text-[22px]">
                  <span className="text-orange-500">Inventory </span>
                  <span className="text-slate-800">Stock</span>
                </h2>
                <div className="w-full max-w-[170px] rounded-full border border-orange-300 px-3 py-1 sm:max-w-[220px]">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Search className="h-3.5 w-3.5" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder={t('seller.searchInventory')}
                      className="w-full bg-transparent text-[11px] font-normal outline-none placeholder:text-[11px] placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 grid max-h-[620px] grid-cols-2 gap-2 overflow-y-auto pr-0">
                {visibleInventory.map((item, index) => {
                  const note = stockNoteByProductCode.get(item.code);
                  const cardKey = `inventory-${item.code}-${index}`;

                  return (
                    <div key={cardKey} className="relative">
                      {note ? (
                        <span className="pointer-events-none absolute left-1/2 top-1 z-10 inline-flex -translate-x-1/2 items-center justify-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold leading-none text-orange-600 shadow-sm">
                          Note
                        </span>
                      ) : null}

                      <button
                        type="button"
                        onPointerDown={() => handleProductCardPressStart(item, cardKey)}
                        onPointerUp={handleProductCardPressEnd}
                        onPointerLeave={handleProductCardPressEnd}
                        onPointerCancel={handleProductCardPressEnd}
                        className={`no-hover-lift grid min-h-[66px] w-full grid-cols-[1fr_auto] overflow-hidden rounded-[10px] border border-slate-200 bg-white text-left shadow-sm transition hover:border-orange-300 hover:shadow-md ${holdingProductCard === cardKey ? 'ring-2 ring-orange-200' : ''}`}
                      >
                        <div className="flex items-start gap-2 p-1.5">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            {item.image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-green-500 to-green-700 text-xl font-black text-white">{item.name.charAt(0)}</div>
                            )}
                          </div>
                          <div className="min-w-0 flex h-14 flex-1 flex-col justify-between py-0.5">
                            <p className="line-clamp-2 text-[10.5px] font-semibold leading-[0.98rem] text-slate-800">{item.name}</p>
                            <p className="text-[10px] leading-none text-slate-400">CD: {item.code}</p>
                          </div>
                        </div>
                        <div className={`flex w-[22px] shrink-0 items-center justify-center ${stockStripColors[index % stockStripColors.length]}`}>
                          <div className="grid h-full w-full place-items-center">
                            <span className="inline-block [writing-mode:vertical-rl] text-[8px] font-normal leading-none tracking-[0.02em] text-black dark:text-black">
                              In stock <span className="text-[9px] font-semibold">{item.stock}</span>
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2" />
            </section>
          </>
        ) : orderListView ? (
          <>
            <div ref={globalSearchContainerRef} className="relative mb-3 rounded-full border border-orange-300 bg-white px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-400">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={currentOrdersSearchTerm}
                  onFocus={() => setIsGlobalSearchOpen(true)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCurrentOrdersSearchTerm(value);
                    setGlobalSearchTerm(value);
                    setIsGlobalSearchOpen(true);
                  }}
                  placeholder="Search customers..."
                  className="w-full bg-transparent text-[13px] font-light outline-none placeholder:font-light placeholder:text-slate-400 bangla-font"
                />
              </div>

              {showGlobalSearchResults ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {globalSellerSearchResults.length > 0 ? (
                    globalSellerSearchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectGlobalSearchResult(item)}
                        className="flex w-full items-start justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                          <span className="block truncate text-xs text-slate-500">{item.description}</span>
                        </span>
                        <span className="ml-3 shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                          {item.type}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center text-xs font-medium text-slate-500">
                      No matching data in seller panel.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <section className="rounded-[18px] border border-slate-200 bg-white px-4 pb-4 pt-2.5 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <h1 className="text-[19px] font-semibold uppercase tracking-tight text-orange-500 sm:text-[22px]">{isCustomerLedsView ? 'CUSTOMER/LEDS DETAILS' : 'ORDERS DETAILS'}</h1>
                <div className="flex items-center gap-2">
                  {!isCustomerLedsView ? (
                    <button
                      type="button"
                      onClick={() => {
                        void refreshDeliveryIndicators(false);
                      }}
                      disabled={indicatorRefreshLoading}
                      title={lastIndicatorRefreshAt ? `Last refresh: ${new Date(lastIndicatorRefreshAt).toLocaleTimeString()}` : 'Refresh delivery indicators'}
                      className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {indicatorRefreshLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  ) : null}
                  <button
                    ref={orderListDateToggleRef}
                    type="button"
                    onClick={() => setCurrentDatePanelOpen((prev) => !prev)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[15px] font-normal text-slate-700"
                  >
                    {currentRangeButtonLabel}
                    <span className="text-xs">▼</span>
                  </button>
                </div>
              </div>

              {!isCustomerLedsView ? (
                <div className="mt-2 flex min-h-[34px] justify-end">
                  {ordersSyncState === 'syncing' || ordersSyncState === 'saved' ? (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold sm:text-[12px] ${ordersSyncState === 'syncing'
                        ? 'border border-blue-200 bg-blue-50 text-blue-700'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {ordersSyncState === 'syncing' ? 'Syncing orders...' : 'Orders saved'}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="relative mt-3">
                {currentDatePanelOpen && (
                  <div ref={orderListDatePanelRef} className="absolute left-0 top-0 z-20 w-full rounded-[16px] border border-slate-200 bg-white p-3 shadow-2xl">
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[620px] grid-cols-[170px_1fr] gap-4">
                        <div className="space-y-1 border-r border-slate-100 pr-4 text-sm text-slate-700">
                          {dateOptions.map((option) => (
                            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-slate-50">
                              <input
                                type="radio"
                                name="salesDateRange"
                                checked={currentDateRangeOption === option}
                                onChange={() => setCurrentDateRangeOption(option as DateRangeOption)}
                                className="accent-orange-500"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                        <div className="rounded-[14px] border border-slate-200 bg-white p-2">
                          <div className="mb-2 flex items-center justify-between gap-2 px-2 pt-1 text-slate-700">
                            <button type="button" className="text-2xl leading-none">‹</button>
                            <DatePanelPicker
                              monthIndex={currentSelectedMonth}
                              year={currentSelectedYear}
                              onMonthChange={isCustomerLedsView ? setLedsSelectedMonth : setSalesSelectedMonth}
                              onYearChange={isCustomerLedsView ? setLedsSelectedYear : setSalesSelectedYear}
                            />
                            <button type="button" className="text-2xl leading-none">›</button>
                          </div>
                          <div className="grid grid-cols-7 gap-y-2 text-center text-[15px] text-slate-700">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                              <div key={day} className="py-1 font-medium">{day}</div>
                            ))}
                            {currentCalendarDays.map((day, index) => (
                              <button
                                key={`${currentSelectedYear}-${currentSelectedMonth}-${index}`}
                                type="button"
                                disabled={!day}
                                onClick={() => {
                                  if (day) {
                                    handleCurrentCustomDaySelect(day);
                                  }
                                }}
                                className={`rounded-md py-2 ${!day
                                  ? 'cursor-default text-slate-300'
                                  : currentPanelDayBounds && day >= currentPanelDayBounds.startDay && day <= currentPanelDayBounds.endDay
                                    ? 'bg-orange-500 font-semibold text-white'
                                    : isCurrentPanelMonth && day === todayDayOfMonth
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'text-slate-900 hover:bg-slate-100'
                                }`}
                              >
                                {day ?? ''}
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-end gap-4 px-2 pb-1 text-sm">
                            <button type="button" className="text-slate-700" onClick={closeCurrentDatePanel}>Cancel</button>
                            <button type="button" className="rounded-md bg-orange-500 px-4 py-2 text-white" onClick={closeCurrentDatePanel}>Update</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleCreateSalesOrder(isCustomerLedsView ? 'leds' : 'sales')}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-5 py-2 text-[14px] font-semibold leading-none text-white shadow-sm transition hover:bg-green-700"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[13px] font-normal leading-none">+</span>
                    <span className="leading-none">{isCustomerLedsView ? 'Create New Leds' : 'Create New Sales'}</span>
                  </button>
                </div>

                {!isCustomerLedsView ? (
                  <div className="mt-4 flex min-h-[34px] flex-nowrap items-center justify-center gap-0.5 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {currentFilterChips.map((chip) => {
                      const active = currentStatusFilter === chip.key;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => {
                            setSalesStatusFilter(chip.key as SalesFilterStatus);
                          }}
                          className={`shrink-0 whitespace-nowrap rounded-full border px-1.5 py-1.5 text-[8px] font-semibold leading-none transition sm:px-2 sm:text-[9px] ${active ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-orange-300 hover:text-orange-600'}`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-4 space-y-4" style={{ overflowAnchor: 'none' }}>
                  {(isCustomerLedsView
                    ? [
                        {
                          key: 'customer-leds' as const,
                          label: 'CUSTOMER LEDS',
                          titleClass: 'text-cyan-500',
                          rows: dateFilteredLedsOrders,
                        },
                      ]
                    : visibleSalesSections.map((section) => ({
                        key: section.key,
                        label: section.label,
                        titleClass: section.titleClass,
                        rows: groupedSalesOrders[section.key],
                      }))).map((section) => {
                    const rows = section.rows;
                    return (
                      <section key={section.key} className="rounded-[18px] border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
                          <h2 className={`text-[15px] font-semibold leading-tight sm:text-[18px] ${section.titleClass}`}>{section.label}</h2>
                          <p className="text-[11px] font-normal text-slate-600 sm:text-[12px]">{currentPanelDateLabel}</p>
                        </div>

                        <div className={`${isCustomerLedsView ? 'max-h-[calc(100dvh-290px)]' : 'max-h-[132px]'} space-y-2 overflow-y-auto px-3 py-3 pr-2`}>
                          {rows.length > 0 ? (
                            rows.map((item, index) => (
                              <div
                                key={`${item.orderId}-${index}`}
                                onMouseDown={() => handleSalesRowPressStart(`${section.key}-${item.orderId}-${index}`)}
                                onMouseUp={handleSalesRowPressEnd}
                                onMouseLeave={handleSalesRowPressEnd}
                                onTouchStart={() => handleSalesRowPressStart(`${section.key}-${item.orderId}-${index}`)}
                                onTouchEnd={handleSalesRowPressEnd}
                                onTouchCancel={handleSalesRowPressEnd}
                                className="rounded-md border border-[rgba(148,163,184,0.35)] bg-[rgba(148,163,184,0.06)] px-2 py-1.5 text-[10px] font-medium text-slate-600 sm:text-[11px]"
                              >
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className="grid flex-1 grid-cols-[0.82fr_1.02fr_1fr_0.9fr] gap-1 text-[9px] leading-tight whitespace-nowrap sm:grid-cols-[0.85fr_1.2fr_1fr_0.9fr] sm:gap-2 sm:text-[11px]">
                                    <p className="min-w-0 overflow-hidden text-ellipsis">
                                      <span className="font-medium text-slate-500 sm:hidden">ID:</span>
                                      <span className="hidden font-medium text-slate-500 sm:inline">ID:</span>{' '}
                                      <span className="font-semibold text-slate-700">{item.orderId}</span>
                                    </p>
                                    <p className="min-w-0 overflow-hidden text-ellipsis">
                                      <span className="font-medium text-slate-500 sm:hidden">N:</span>
                                      <span className="hidden font-medium text-slate-500 sm:inline">NAME:</span>{' '}
                                      <span className="font-semibold text-slate-700">{item.name}</span>
                                    </p>
                                    <p className="min-w-0 overflow-hidden text-ellipsis">
                                      <span className="font-medium text-slate-500 sm:hidden">M:</span>
                                      <span className="hidden font-medium text-slate-500 sm:inline">MOBILE:</span>{' '}
                                      <span className="font-semibold text-slate-700">{item.mobile}</span>
                                    </p>
                                    <p className="min-w-0 overflow-hidden text-ellipsis">
                                      <span className="font-medium text-slate-500 sm:hidden">D:</span>
                                      <span className="hidden font-medium text-slate-500 sm:inline">DATE:</span>{' '}
                                      <span className="font-semibold text-slate-700">{item.date}</span>
                                    </p>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                                    <span
                                      title={`SMS: ${(item.smsState || 'pending').toUpperCase()}`}
                                      className={`inline-block h-4 w-4 rounded-full border sm:h-5 sm:w-5 ${getIndicatorDotClass('sms', normalizeDeliveryIndicatorState(item.smsState))}`}
                                    />
                                    <span
                                      title={`Courier: ${(item.courierState || 'pending').toUpperCase()}`}
                                      className={`inline-block h-4 w-4 rounded-full border sm:h-5 sm:w-5 ${getIndicatorDotClass('courier', normalizeDeliveryIndicatorState(item.courierState))}`}
                                    />
                                  </div>
                                </div>

                                {holdingSalesRow === `${section.key}-${item.orderId}-${index}` && activeSalesActionRow !== `${section.key}-${item.orderId}-${index}` ? (
                                  <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                                    Hold 2s for Edit/Delete
                                  </div>
                                ) : null}

                                {activeSalesActionRow === `${section.key}-${item.orderId}-${index}` ? (
                                  <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-300 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveSalesActionRow(null);
                                        setHoldingSalesRow(null);
                                      }}
                                      className="rounded-md bg-slate-500 px-2.5 py-1 text-[11px] font-semibold text-white"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSalesData(item)}
                                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      Download Data
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditSalesOrder(item, isCustomerLedsView ? 'leds' : 'sales')}
                                      className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSalesOrder(item, isCustomerLedsView ? 'leds' : 'sales')}
                                      className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-md bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">
                              Data Not Available
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </section>

            {isCreateSalesModalOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-4">
                <div className="max-h-[94vh] w-full max-w-[760px] overflow-y-auto rounded-[14px] border border-slate-300 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h3 className="text-[18px] font-normal text-slate-900">{editingSalesOrder ? (orderFlowType === 'leds' ? 'Edit Customer Led' : 'Edit Customer Order') : (orderFlowType === 'leds' ? 'Create New Customer Leds' : 'Create New Customer Orders')}</h3>
                    <button
                      type="button"
                      onClick={handleCloseCreateSalesModal}
                      className="text-red-500 transition hover:text-red-600"
                      aria-label="Close Create Sale modal"
                    >
                      <X className="h-7 w-7" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitCreateSales} className="space-y-4">
                    <div className="border-b border-slate-200 px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-[16px] font-normal text-slate-600">Status</span>
                        <div ref={salesStatusDropdownRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
                            className={`inline-flex min-w-[238px] items-center justify-between rounded-[12px] border border-slate-300 bg-white px-4 py-1.5 text-[16px] font-semibold outline-none ${salesStatusTextClass[createSalesForm.status]}`}
                          >
                            {salesStatusLabel[createSalesForm.status]}
                            <span className="ml-4 text-slate-500">▾</span>
                          </button>
                          {isStatusDropdownOpen ? (
                            <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-full rounded-[12px] border border-slate-300 bg-white p-1 shadow-lg">
                              {ledsStatusOptions.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => {
                                    handleCreateSalesInput('status', status);
                                    setIsStatusDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center rounded-[10px] px-3 py-2 text-left text-[15px] font-semibold ${createSalesForm.status === status ? 'bg-[#0b63d1] text-white hover:bg-[#0b63d1]' : `${salesStatusTextClass[status]} ${salesStatusHoverClass[status]}`}`}
                                >
                                  {salesStatusLabel[status]}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-6">
                      <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-[16px] font-normal text-slate-500">Order Date</label>
                            <input
                              type="date"
                              value={createSalesForm.orderDate}
                              onChange={(event) => handleCreateSalesInput('orderDate', event.target.value)}
                              className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[16px] font-normal text-slate-500">Order ID</label>
                            <input
                              value={createSalesForm.orderId}
                              onChange={(event) => handleCreateSalesInput('orderId', event.target.value)}
                              className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[16px] font-normal text-slate-500">Products Sample</label>
                          <input ref={salesSampleInputRef} type="file" accept="image/*" onChange={handleSalesSampleImage} className="hidden" />
                          <button
                            type="button"
                            onClick={() => salesSampleInputRef.current?.click()}
                            className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-[12px] border border-slate-300 bg-slate-50/70 text-slate-500 transition hover:bg-slate-100"
                          >
                            {createSalesForm.sampleImageUrl ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={createSalesForm.sampleImageUrl} alt={createSalesForm.sampleImageName || 'Uploaded sample'} className="h-full w-full object-contain bg-slate-100" />
                                <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[11px] text-white">
                                  <p className="truncate">{createSalesForm.sampleImageName}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Upload className="h-8 w-8" />
                                <p className="mt-2 text-[15px] font-medium">Upload Image</p>
                                <p className="text-xs">Max Size 2 MB</p>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[16px] font-normal text-slate-500">Customer Name</label>
                        <input
                          value={createSalesForm.customerName}
                          onChange={(event) => handleCreateSalesInput('customerName', event.target.value)}
                          className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex items-center gap-5 text-[16px] font-normal text-slate-500">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name="contactType"
                              checked={createSalesForm.contactType === 'mobile'}
                              onChange={() => handleCreateSalesInput('contactType', 'mobile')}
                              className="accent-slate-600"
                            />
                            Mobile
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name="contactType"
                              checked={createSalesForm.contactType === 'whatsapp'}
                              onChange={() => handleCreateSalesInput('contactType', 'whatsapp')}
                              className="accent-slate-600"
                            />
                            Whatsapp
                          </label>
                        </div>
                        <input
                          value={createSalesForm.contactValue}
                          onChange={(event) => handleCreateSalesInput('contactValue', event.target.value)}
                          className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[16px] font-normal text-slate-500">Village/Road</label>
                        <input
                          value={createSalesForm.villageRoad}
                          onChange={(event) => handleCreateSalesInput('villageRoad', event.target.value)}
                          className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[16px] font-normal text-slate-500">Police station</label>
                          <input
                            value={createSalesForm.policeStation}
                            onChange={(event) => handleCreateSalesInput('policeStation', event.target.value)}
                            className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[16px] font-normal text-slate-500">Distric</label>
                          <input
                            value={createSalesForm.district}
                            onChange={(event) => handleCreateSalesInput('district', event.target.value)}
                            className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-200 px-6 py-4">
                      <div>
                        <label className="mb-1 block text-[16px] font-normal text-slate-500">Products Details</label>
                        <textarea
                          rows={5}
                          value={createSalesForm.productsDetails}
                          onChange={(event) => handleCreateSalesInput('productsDetails', event.target.value)}
                          className="w-full resize-y rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[16px] font-normal text-slate-500">Sub Total</label>
                          <input
                            value={createSalesForm.subTotal}
                            onChange={(event) => handleCreateSalesInput('subTotal', event.target.value)}
                            className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[16px] font-normal text-slate-500">Discount</label>
                          <input
                            value={createSalesForm.discount}
                            onChange={(event) => handleCreateSalesInput('discount', event.target.value)}
                            className="w-full rounded-[12px] border border-slate-300 px-3 py-2 text-sm text-black outline-none focus:border-orange-400"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[16px] font-normal text-slate-500">Total Taka</label>
                          <input
                            value={createSalesForm.totalTaka}
                            readOnly
                            className="w-full cursor-not-allowed rounded-[12px] border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-black outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
                      <button
                        type="button"
                        onClick={handleCloseCreateSalesModal}
                        className="inline-flex min-w-[170px] items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-1.5 text-[18px] font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-2 text-[14px] font-medium text-white transition hover:bg-green-700"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[12px] font-normal leading-none">+</span>
                        <span className="leading-none">{editingSalesOrder ? (orderFlowType === 'leds' ? 'Update Led' : 'Update Sale') : (orderFlowType === 'leds' ? 'Create Led' : 'Create Sale')}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </>
        ) : productStockView ? (
          <>
            <div ref={globalSearchContainerRef} className="relative mb-3 rounded-full border border-orange-300 bg-white px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2.5 text-slate-400">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  value={productStockSearchTerm}
                  onFocus={() => setIsGlobalSearchOpen(true)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProductStockSearchTerm(value);
                    setGlobalSearchTerm(value);
                    setIsGlobalSearchOpen(true);
                  }}
                  placeholder={productStockStage === 'products' ? 'Search products' : 'Search categories'}
                  className="w-full bg-transparent text-[13px] font-light outline-none placeholder:font-light placeholder:text-slate-400 bangla-font"
                />
              </div>

              {showGlobalSearchResults ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {globalSellerSearchResults.length > 0 ? (
                    globalSellerSearchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectGlobalSearchResult(item)}
                        className="flex w-full items-start justify-between rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">{item.label}</span>
                          <span className="block truncate text-xs text-slate-500">{item.description}</span>
                        </span>
                        <span className="ml-3 shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                          {item.type}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center text-xs font-medium text-slate-500">
                      No matching data in seller panel.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {productStockStage === 'categories' ? (
              <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
                <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                  <h2 className="whitespace-nowrap text-[22px] font-bold sm:text-[28px]">
                    <span className="text-orange-500">Select </span>
                    <span className="text-slate-700">Category</span>
                  </h2>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-4">
                  {filteredSellerCategories.map((category) => {
                    const isActive = selectedSellerCategoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setSelectedSellerCategoryId(category.id);
                          setProductStockStage('products');
                          setProductStockSearchTerm('');
                        }}
                        className={`rounded-[16px] border p-3 text-center shadow-sm transition ${isActive
                          ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-200'
                          : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[14px] border border-orange-300 bg-orange-500 text-[38px] font-black text-white shadow-sm">
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="mt-3 truncate text-[19px] font-semibold text-slate-800">{category.name}</p>
                      </button>
                    );
                  })}
                </div>

                {filteredSellerCategories.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                    No categories available.
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-300 pb-2">
                  <h2 className="whitespace-nowrap text-[22px] font-bold sm:text-[28px]">
                    <span className="text-orange-500">Inventory </span>
                    <span className="text-slate-700">Stock</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setProductStockStage('categories');
                      setProductStockSearchTerm('');
                    }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Change Category
                  </button>
                </div>

                <div className="mt-2 text-[13px] font-semibold text-slate-500">
                  Selected: <span className="text-slate-700">{selectedSellerCategory?.name || 'Category'}</span>
                </div>

                <div className="mt-3 grid max-h-[620px] grid-cols-2 gap-2 overflow-y-auto pr-0">
                  {filteredCategoryProducts.map((item, index) => {
                    const note = stockNoteByProductCode.get(item.code);
                    const cardKey = `${item.code}-${index}`;

                    return (
                      <div key={cardKey} className="relative">
                        {note ? (
                          <span className="pointer-events-none absolute left-1/2 top-1 z-10 inline-flex -translate-x-1/2 items-center justify-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold leading-none text-orange-600 shadow-sm">
                            Note
                          </span>
                        ) : null}

                        <button
                          type="button"
                          onPointerDown={() => handleProductCardPressStart(item, cardKey)}
                          onPointerUp={handleProductCardPressEnd}
                          onPointerLeave={handleProductCardPressEnd}
                          onPointerCancel={handleProductCardPressEnd}
                          className={`no-hover-lift grid min-h-[66px] w-full grid-cols-[1fr_auto] overflow-hidden rounded-[10px] border border-slate-200 bg-white text-left shadow-sm transition hover:border-orange-300 hover:shadow-md ${holdingProductCard === cardKey ? 'ring-2 ring-orange-200' : ''}`}
                        >
                          <div className="flex min-w-0 items-start gap-2 p-1.5">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              {item.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-green-500 to-green-700 text-xl font-black text-white">{item.name.charAt(0)}</div>
                              )}
                            </div>
                            <div className="min-w-0 flex h-14 flex-1 flex-col justify-between py-0.5">
                              <p className="line-clamp-2 text-[10.5px] font-semibold leading-[0.98rem] text-slate-800">{item.name}</p>
                              <p className="text-[10px] leading-none text-slate-400">CD: {item.code}</p>
                            </div>
                          </div>
                          <div className={`flex w-[22px] shrink-0 items-center justify-center ${stockStripColors[index % stockStripColors.length]}`}>
                            <div className="grid h-full w-full place-items-center">
                              <span className="inline-block [writing-mode:vertical-rl] text-[8px] font-normal leading-none tracking-[0.02em] text-black dark:text-black">
                                In stock <span className="text-[9px] font-semibold">{item.stock}</span>
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2" />

                {filteredCategoryProducts.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                    No products found in this category.
                  </div>
                ) : null}
              </section>
            )}
          </>
        ) : activeView === 'attendance' ? (
          <SellerAttendanceDashboard sellerId={profile.sellerId} profile={profile} />
        ) : (
          <section className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-sm font-semibold text-orange-500">{t('seller.navigation.dashboard')}</p>
                <h2 className="text-2xl font-black text-slate-900">{getPlaceholderTitle(activeView)}</h2>
              </div>
              <button type="button" onClick={() => setActiveView('home')} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {t('common.back')}
              </button>
            </div>
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-orange-100 text-orange-600">
                <ArrowRight className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t('common.loading')} {t('seller.navigation.dashboard')}</h3>
              <p className="mt-2 text-sm text-slate-500">This screen will be implemented in the next phase.</p>
            </div>
          </section>
        )}

        {isStockNoteModalOpen && selectedStockProduct ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-[540px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-slate-900">
                  <h3 className="text-[18px] font-semibold leading-none sm:text-[21px]">
                    <span className="text-orange-500">Product Stock </span>
                    <span className="text-slate-700">Note</span>
                  </h3>
                  <span className="text-[20px] text-slate-300 sm:text-[24px]">|</span>
                  <span className="text-[12px] font-medium text-slate-500 sm:text-[14px]">ID: {profile.sellerId || 'SELLER'}</span>
                </div>
                <button
                  type="button"
                  onClick={closeStockNoteModal}
                  className="text-[18px] font-semibold text-red-500 transition hover:text-red-600"
                >
                  X
                </button>
              </div>

              <div className="space-y-4 px-5 py-4">
                <p className="text-sm font-semibold text-slate-500">
                  {selectedStockProduct.name} ({selectedStockProduct.code})
                </p>
                <textarea
                  value={stockNoteText}
                  onChange={(event) => setStockNoteText(event.target.value)}
                  rows={7}
                  placeholder="Example this section etc..."
                  className="w-full resize-none rounded-[14px] border border-slate-300 bg-slate-50 px-4 py-3 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 px-5 pb-5">
                <button
                  type="button"
                  onClick={closeStockNoteModal}
                  className="min-w-[120px] rounded-full border border-slate-300 bg-white px-5 py-2 text-[16px] font-medium text-slate-500 shadow-sm transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  {activeModalStockNote ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveStockNote}
                        className="min-w-[120px] rounded-full bg-emerald-500 px-5 py-2 text-[16px] font-bold text-white shadow-sm transition hover:bg-emerald-600"
                      >
                        Update Note
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteStockNote}
                        className="min-w-[120px] rounded-full bg-red-500 px-5 py-2 text-[16px] font-bold text-white shadow-sm transition hover:bg-red-600"
                      >
                        Delete Note
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveStockNote}
                      className="min-w-[140px] rounded-full bg-green-600 px-5 py-2 text-[15px] font-bold leading-none text-white shadow-sm transition hover:bg-green-700"
                    >
                      Create Note
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <SupportChatWidget role="seller" displayName={displayName} senderId={profile.sellerId || 'SELLER'} />

      <SellerFooterNav activeView={activeView} onNavigate={handleNavigateSellerView} />
    </div>
  );
}