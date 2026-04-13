'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

type OrderItem = {
  id: string;
  customer: string;
  amount: number;
  status: 'Pending' | 'Done' | 'Cancel';
  time: string;
};

type InventoryItem = {
  code: string;
  name: string;
  stock: number;
  image?: string | null;
};

type SellerDashboardResponse = {
  success?: boolean;
  data?: {
    recentOrders?: Array<{
      id?: string;
      orderId?: string;
      customer?: string;
      customerName?: string;
      amount?: number;
      status?: string;
      createdAt?: string;
    }>;
  };
};

type ProductsResponse = {
  success?: boolean;
  data?: Array<{
    sku?: string;
    name?: string;
    quantity?: number;
    imageUrl?: string | null;
  }>;
};

type SellerProfileResponse = {
  success?: boolean;
  data?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
  };
};

type SellerProfile = {
  name: string;
  image: string;
};

type Category = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
};

type CategoriesResponse = {
  success?: boolean;
  data?: Category[];
};

const bottomTabs = [
  { key: 'orders', icon: 'orders', label: 'Orders', isCenter: false },
  { key: 'products', icon: 'products', label: 'Products', isCenter: false },
  { key: 'home', icon: 'home', label: 'HOME', isCenter: true },
  { key: 'customers', icon: 'customers', label: 'Customers', isCenter: false },
  { key: 'profile', icon: 'profile', label: 'Profile', isCenter: false },
] as const;

const fallbackOrders: OrderItem[] = [
  { id: 'ORD-2051', customer: 'Nusrat Jahan', amount: 9600, status: 'Pending', time: 'Just now' },
  { id: 'ORD-2050', customer: 'Rafiul Karim', amount: 15400, status: 'Done', time: '11 min ago' },
  { id: 'ORD-2048', customer: 'Mim Akter', amount: 4100, status: 'Cancel', time: '39 min ago' },
  { id: 'ORD-2046', customer: 'Mahim Rahman', amount: 8800, status: 'Done', time: '1 hour ago' },
];

const fallbackInventory: InventoryItem[] = [
  { code: 'LX-BAG-1001', name: 'Premium Handbag', stock: 18 },
  { code: 'LX-SHOE-204', name: 'Runner Shoes', stock: 7 },
  { code: 'LX-WAT-412', name: 'Classic Watch', stock: 0 },
  { code: 'LX-WAL-909', name: 'Leather Wallet', stock: 33 },
];

const chartSeries = {
  day: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    revenue: [52, 61, 55, 70, 64, 82, 75],
    sales: [48, 55, 60, 65, 72, 78, 80],
    expense: [22, 28, 24, 31, 26, 35, 30],
  },
  week: {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'],
    revenue: [44, 56, 59, 67, 71, 77, 83],
    sales: [40, 49, 54, 60, 66, 73, 79],
    expense: [20, 23, 25, 28, 30, 33, 36],
  },
  month: {
    labels: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'],
    revenue: [35, 43, 52, 63, 72, 78, 86],
    sales: [31, 40, 47, 56, 65, 72, 81],
    expense: [17, 20, 23, 27, 31, 34, 38],
  },
} as const;

function toLinePoints(points: readonly number[]) {
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 70 - (point / 100) * 60;
      return `${x},${y}`;
    })
    .join(' ');
}

function money(value: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeStatus(status?: string): 'Pending' | 'Done' | 'Cancel' {
  const value = (status || '').toLowerCase();
  if (value === 'done' || value === 'completed' || value === 'confirmed' || value === 'shipped') return 'Done';
  if (value === 'cancel' || value === 'cancelled' || value === 'canceled') return 'Cancel';
  return 'Pending';
}

function getStatusTone(status: OrderItem['status']) {
  if (status === 'Done') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Cancel') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function iconFor(key: string) {
  switch (key) {
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" className="icon-svg h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M8 9h8M8 13h8" />
        </svg>
      );
    case 'products':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" className="icon-svg h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 8 12 3l8 5-8 5-8-5Z" />
          <path d="M4 8v8l8 5 8-5V8" />
        </svg>
      );
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" className="icon-svg h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'customers':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" className="icon-svg h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="9" cy="8" r="3" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M3.5 19c.8-2.4 2.9-4 5.5-4s4.7 1.6 5.5 4" />
          <path d="M13 19c.4-1.8 1.8-3.1 3.7-3.3 1.3-.2 2.5.4 3.8 1.5" />
        </svg>
      );
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" className="icon-svg-lg h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.1 0-2.2-.2-3.2-.6L4 21l1.8-4.6A8.5 8.5 0 1 1 21 11.5Z" />
        </svg>
      );
    case 'profile':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" className="icon-svg h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.8-3.6 4.8-5.4 8-5.4 3.2 0 6.2 1.8 8 5.4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" className="icon-svg h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 11.5 12 4l9 7.5V21H3v-9.5Z" />
          <path d="M9 21v-5h6v5" />
        </svg>
      );
  }
}

export default function SellerDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<(typeof bottomTabs)[number]['key']>('home');
  const [chartRange, setChartRange] = useState<'day' | 'week' | 'month'>('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<OrderItem[]>(fallbackOrders);
  const [inventory, setInventory] = useState<InventoryItem[]>(fallbackInventory);
  const [profile, setProfile] = useState<SellerProfile>({ name: '', image: '' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const displayName = profile.name?.trim() || 'Seller';

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboardData() {
      try {
        setIsLoading(true);

        const [dashboardResponse, productsResponse, profileResponse, categoriesResponse] = await Promise.allSettled([
          fetch('/api/seller/dashboard', {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          }),
          fetch('/api/products?limit=30', {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          }),
          fetch('/api/seller/profile', {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          }),
          fetch('/api/categories', {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
          }),
        ]);

        let hasSuccess = false;

        if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
          const payload = (await profileResponse.value.json()) as SellerProfileResponse;
          if (payload?.data) {
            setProfile({
              name: payload.data.name?.trim() || '',
              image: payload.data.image || '',
            });
          }
        }

        if (dashboardResponse.status === 'fulfilled' && dashboardResponse.value.ok) {
          const payload = (await dashboardResponse.value.json()) as SellerDashboardResponse;
          const rows = payload?.data?.recentOrders ?? [];
          if (rows.length > 0) {
            hasSuccess = true;
            setOrders(
              rows.map((order, index) => ({
                id: order.orderId || order.id || `ORD-${2050 - index}`,
                customer: order.customer || order.customerName || 'Unknown Customer',
                amount: Number(order.amount) || 0,
                status: normalizeStatus(order.status),
                time: formatTimeAgo(order.createdAt),
              }))
            );
          }
        }

        if (productsResponse.status === 'fulfilled' && productsResponse.value.ok) {
          const payload = (await productsResponse.value.json()) as ProductsResponse;
          const rows = payload?.data ?? [];
          if (rows.length > 0) {
            hasSuccess = true;
            setInventory(
              rows.map((item, index) => ({
                code: item.sku || `LX-ITEM-${index + 1}`,
                name: item.name || 'Unnamed Product',
                stock: Number(item.quantity) || 0,
                image: item.imageUrl || null,
              }))
            );
          }
        }

        if (categoriesResponse.status === 'fulfilled' && categoriesResponse.value.ok) {
          const payload = (await categoriesResponse.value.json()) as CategoriesResponse;
          if (payload?.data && payload.data.length > 0) {
            setCategories(payload.data);
          }
        }

        if (!hasSuccess) {
          // Keep fallback values silently when APIs are unavailable.
        }
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
    return () => controller.abort();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        String(order.amount).includes(query)
    );
  }, [orders, searchTerm]);

  const filteredInventory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return inventory;
    return inventory.filter(
      (item) => item.code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query)
    );
  }, [inventory, searchTerm]);

  const metrics = useMemo(() => {
    const pendingShipment = filteredOrders.filter((order) => order.status === 'Pending').length;
    const activeListings = inventory.filter((item) => item.stock > 0).length;
    const inventoryAlerts = inventory.filter((item) => item.stock <= 5).length;

    return [
      { label: t('seller.totalOrders'), value: filteredOrders.length, icon: 'orders' },
      { label: t('seller.salesTarget'), value: pendingShipment, icon: 'orders' },
      { label: t('seller.products'), value: activeListings, icon: 'products' },
      { label: t('seller.inventory'), value: inventoryAlerts, icon: 'inventory' },
    ];
  }, [filteredOrders, inventory, t]);

  const activeChart = chartSeries[chartRange];
  const revenueLinePoints = toLinePoints(activeChart.revenue);
  const salesLinePoints = toLinePoints(activeChart.sales);
  const expenseLinePoints = toLinePoints(activeChart.expense);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-100">
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white px-4 pt-3">
        <div className="relative mx-auto flex w-full max-w-[1400px] items-center justify-between py-2 lg:px-4">
          <div className="flex w-[170px] items-center gap-2 sm:w-[240px]">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center text-slate-900 transition active:scale-95"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" className="icon-svg-lg h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="min-w-0 w-[118px] shrink-0">
              <img src="/logo.png" alt="Luxo" className="seller-logo h-16 w-auto object-contain" />
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 w-[170px] -translate-x-1/2 text-center sm:w-[220px]">
            <h1 className="text-[24px] font-black uppercase leading-none tracking-[0.08em] text-slate-500 sm:text-[30px]">{t('seller.title').split('/')[0].trim()}</h1>
            <p className="text-[16px] font-bold uppercase leading-none tracking-wide text-slate-500 sm:text-[20px]">{t('seller.title').split('/')[1].trim()}</p>
          </div>

          <div className="flex w-[170px] items-center justify-end gap-2 sm:w-[320px] sm:gap-3">
            <LanguageSwitcher />
            <div className="flex items-center gap-2">
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={displayName}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-orange-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold text-sm ring-2 ring-orange-300">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="max-w-[130px] text-left">
                <p className="truncate text-[14px] font-bold leading-4 text-slate-900">{displayName}</p>
              </div>
            </div>
            <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
              <svg viewBox="0 0 24 24" width="20" height="20" className="icon-svg h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 6 3 9H3c0-3 3-2 3-9" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1280px] pb-4 pt-3 lg:px-4">
          <label className="flex w-full items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 lg:py-2">
              <svg viewBox="0 0 24 24" width="16" height="16" className="icon-svg-sm h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('seller.searchPlaceholder')}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 bangla-font"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 gap-4 bg-slate-100 px-3 pb-40 pt-[168px] lg:grid-cols-12 lg:px-5 lg:pt-[176px]">
        <section className="grid grid-cols-2 gap-2.5 lg:col-span-12 lg:grid-cols-4">
          {metrics.map((metric, index) => {
            const colors = [
              'bg-gradient-to-br from-orange-500 to-orange-600',
              'bg-gradient-to-br from-emerald-500 to-emerald-600',
              'bg-gradient-to-br from-rose-500 to-rose-600',
              'bg-gradient-to-br from-cyan-500 to-cyan-600',
            ];
            return (
              <article
                key={metric.label}
                className={`rounded-2xl p-3 text-white shadow-lg ${colors[index % 4]}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="icon-wrap grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-white">
                    {iconFor(metric.icon)}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 bg-white/20 px-2.5 py-1 rounded-full">{t('seller.today')}</span>
                </div>
                <p className="text-3xl font-black leading-none">{metric.value}</p>
                <p className="mt-2 text-xs font-semibold text-white/90">{metric.label}</p>
              </article>
            );
          })}
        </section>

        {categories.length > 0 && (
          <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 lg:col-span-12">
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-slate-400 bangla-font">{t('seller.quickAccess')}</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">{t('seller.menuItems')}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 text-white text-lg font-bold group-hover:scale-110 transition">
                    {category.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-center text-xs font-semibold text-slate-800 line-clamp-2">{category.name}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white px-0 py-4 ring-1 ring-slate-100 lg:col-span-12">
          <div className="mb-4 flex items-start justify-between px-4 lg:px-6">
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <div className="flex items-center gap-2 text-orange-600">
                <span className="h-3 w-3 rounded-full border-2 border-orange-500" />
                <span className="font-semibold">{t('seller.chart.totalRevenue')}</span>
              </div>
              <div className="flex items-center gap-2 text-pink-500">
                <span className="h-3 w-3 rounded-full border-2 border-pink-500" />
                <span className="font-semibold">{t('seller.chart.totalSales')}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <span className="h-3 w-3 rounded-full border-2 border-emerald-500" />
                <span className="font-semibold">{t('seller.chart.totalExpence')}</span>
              </div>
            </div>

            <div className="rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-700">
              {(['day', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setChartRange(range)}
                  className={`rounded-md px-3 py-1.5 transition ${
                    chartRange === range ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  {t(`seller.chart.${range}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between px-4 lg:px-6">
            <div>
              <p className="bangla-font text-[10px] font-semibold text-slate-400">{t('seller.totalSales')}</p>
              <h2 className="bangla-font mt-1 text-base font-extrabold leading-tight text-slate-900">{t('seller.recentActivities')}</h2>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">270</span>
          </div>

          <div className="rounded-none bg-slate-50 px-1 py-2 lg:px-2 lg:py-4">
            <svg viewBox="0 0 100 70" className="block h-64 w-full lg:h-72" role="img" aria-label="Sales trend chart">
              <defs>
                <linearGradient id="trendRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="trendSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f472b6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f472b6" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="trendExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {[10, 22, 34, 46, 58].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e2e8f0" strokeWidth="0.6" />
              ))}

              <polyline fill="url(#trendRevenue)" points={`0,70 ${revenueLinePoints} 100,70`} />
              <polyline fill="url(#trendSales)" points={`0,70 ${salesLinePoints} 100,70`} />
              <polyline fill="url(#trendExpense)" points={`0,70 ${expenseLinePoints} 100,70`} />
              
              <polyline fill="none" points={revenueLinePoints} stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline fill="none" points={salesLinePoints} stroke="#f472b6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline fill="none" points={expenseLinePoints} stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

              {activeChart.revenue.map((point, index) => {
                const x = (index / (activeChart.revenue.length - 1)) * 100;
                const y = 70 - (point / 100) * 60;
                return <circle key={`revenue-${activeChart.labels[index]}`} cx={x} cy={y} r="1.8" fill="#f97316" />;
              })}

              {activeChart.sales.map((point, index) => {
                const x = (index / (activeChart.sales.length - 1)) * 100;
                const y = 70 - (point / 100) * 60;
                return <circle key={`sales-${activeChart.labels[index]}`} cx={x} cy={y} r="1.8" fill="#f472b6" />;
              })}

              {activeChart.expense.map((point, index) => {
                const x = (index / (activeChart.expense.length - 1)) * 100;
                const y = 70 - (point / 100) * 60;
                return <circle key={`expense-${activeChart.labels[index]}`} cx={x} cy={y} r="1.8" fill="#10b981" />;
              })}

              {activeChart.labels.map((label, index) => {
                const x = (index / (activeChart.labels.length - 1)) * 100;
                return (
                  <text key={label} x={x} y="68" textAnchor="middle" fontSize="4" fill="#64748b">
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="bangla-font text-[10px] font-semibold text-slate-400">{t('seller.recentActivities')}</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">{t('seller.orders')}</h2>
            </div>
            <button type="button" className="text-xs font-semibold text-slate-500">
              {t('common.search')}
            </button>
          </div>

          <div className="space-y-3">
            {filteredOrders.slice(0, 3).map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{order.id}</p>
                    <p className="text-xs text-slate-500">{order.customer}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusTone(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-3 text-xs text-slate-500">
                  <div className="space-y-1">
                    <p>
                      {t('admin.salesPayment.totalAmount')}: <span className="font-semibold text-slate-900">{money(order.amount)}</span>
                    </p>
                    <p>{t('admin.salesPayment.date')}: {order.time}</p>
                  </div>
                  <div className="self-end text-right text-[11px] font-semibold text-slate-400">#{order.id.slice(-4)}</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 lg:col-span-4 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="bangla-font text-[10px] font-semibold text-slate-400">{t('seller.inventory')}</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">{t('admin.productService.stock')}</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">{filteredInventory.length} {t('common.search')}</span>
          </div>

          <div className="space-y-2.5">
            {filteredInventory.slice(0, 4).map((item) => (
              <article key={item.code} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-11 w-11 rounded-xl object-cover" referrerPolicy="no-referrer" />
                ) : <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-orange-600">PK</div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.code}</p>
                </div>
                <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {item.stock > 0 ? `${item.stock} - In Stock` : '0 - Out of Stock'}
                </div>
              </article>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="rounded-2xl bg-white p-3 text-center text-xs font-semibold text-slate-500 ring-1 ring-slate-100 lg:col-span-8">
            {t('messages.loadingData')}
          </div>
        ) : null}

      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-3 py-2">
        <ul className="relative mx-auto grid h-16 w-full max-w-[1400px] grid-cols-5 items-center gap-0 lg:px-4">
          {bottomTabs.map((item) => {
            const isActive = activeTab === item.key;
            const isCenter = item.isCenter;
            
            return (
              <li
                key={item.key}
                className={`flex justify-center ${isCenter ? 'relative -top-5' : 'h-full items-center'}`}
              >
                {isCenter ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className="relative flex flex-col items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-2xl shadow-orange-300/40 transition hover:shadow-orange-400/50 active:scale-95"
                  >
                    <span className="scale-150">{iconFor(item.icon)}</span>
                    <span className="text-[9px] font-bold text-white mt-1">
                      {item.label}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 py-0 transition ${
                      isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {isActive && <span className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-orange-500" />}
                    <span className="scale-125">{iconFor(item.icon)}</span>
                    <span className="max-w-[70px] truncate whitespace-nowrap text-center text-[9px] font-semibold leading-tight">
                      {item.label}
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
