'use client';

import { useEffect, useMemo, useState } from 'react';

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

const bottomTabs = [
  { key: 'home', icon: 'home' },
  { key: 'orders', icon: 'orders' },
  { key: 'chat', icon: 'chat' },
  { key: 'inventory', icon: 'products' },
  { key: 'profile', icon: 'profile' },
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

const trendPoints = [52, 61, 55, 70, 64, 82, 75];
const trendLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M8 9h8M8 13h8" />
        </svg>
      );
    case 'products':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 8 12 3l8 5-8 5-8-5Z" />
          <path d="M4 8v8l8 5 8-5V8" />
        </svg>
      );
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'customers':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="9" cy="8" r="3" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M3.5 19c.8-2.4 2.9-4 5.5-4s4.7 1.6 5.5 4" />
          <path d="M13 19c.4-1.8 1.8-3.1 3.7-3.3 1.3-.2 2.5.4 3.8 1.5" />
        </svg>
      );
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.1 0-2.2-.2-3.2-.6L4 21l1.8-4.6A8.5 8.5 0 1 1 21 11.5Z" />
        </svg>
      );
    case 'profile':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.8-3.6 4.8-5.4 8-5.4 3.2 0 6.2 1.8 8 5.4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 11.5 12 4l9 7.5V21H3v-9.5Z" />
          <path d="M9 21v-5h6v5" />
        </svg>
      );
  }
}

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState<(typeof bottomTabs)[number]['key']>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<OrderItem[]>(fallbackOrders);
  const [inventory, setInventory] = useState<InventoryItem[]>(fallbackInventory);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboardData() {
      try {
        setIsLoading(true);

        const [dashboardResponse, productsResponse] = await Promise.allSettled([
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
        ]);

        let hasSuccess = false;

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
      { label: 'New Orders', value: filteredOrders.length, icon: 'orders' },
      { label: 'Pending Shipment', value: pendingShipment, icon: 'orders' },
      { label: 'Active Listings', value: activeListings, icon: 'products' },
      { label: 'Inventory Alerts', value: inventoryAlerts, icon: 'inventory' },
    ];
  }, [filteredOrders, inventory]);

  const linePoints = trendPoints
    .map((point, index) => {
      const x = (index / (trendPoints.length - 1)) * 100;
      const y = 70 - (point / 100) * 60;
      return `${x},${y}`;
    })
    .join(' ');

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
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="min-w-0 w-[118px] shrink-0">
              <img src="/logo.png" alt="Luxo" className="h-16 w-auto object-contain" />
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 w-[170px] -translate-x-1/2 text-center sm:w-[220px]">
            <h1 className="text-[24px] font-black uppercase leading-none tracking-[0.08em] text-slate-500 sm:text-[30px]">SALLER</h1>
            <p className="text-[16px] font-bold uppercase leading-none tracking-wide text-slate-500 sm:text-[20px]">DASHBOARD</p>
          </div>

          <div className="flex w-[170px] items-center justify-end gap-2 sm:w-[240px] sm:gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full ring-2 ring-orange-300">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=60"
                alt="Rabeya Begum"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden text-slate-900 sm:block">
              <p className="text-[20px] font-bold leading-5">Rabeya</p>
              <p className="text-[20px] font-bold leading-5">Begum</p>
            </div>
            <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 6 3 9H3c0-3 3-2 3-9" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1280px] pb-4 pt-3 lg:px-4">
          <label className="flex w-full items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 lg:py-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="সার্চ প্রোডাক্ট বা অর্ডার..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 bangla-font"
            />
          </label>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 gap-4 bg-slate-100 px-3 pb-32 pt-[168px] lg:grid-cols-12 lg:px-5 lg:pt-[176px]">
        <section className="grid grid-cols-2 gap-2.5 lg:col-span-12 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <article
              key={metric.label}
              className={`rounded-2xl p-3 text-white shadow-lg ${index % 2 === 0 ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-orange-400 to-orange-500'}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-white">
                  {iconFor(metric.icon)}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-50">Today</span>
              </div>
              <p className="text-3xl font-black leading-none">{metric.value}</p>
              <p className="mt-2 text-xs font-semibold text-orange-50">{metric.label}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 lg:col-span-12">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="bangla-font text-[10px] font-semibold text-slate-400">বিক্রয় ভিজ্যুয়ালাইজেশন</p>
              <h2 className="bangla-font mt-1 text-base font-extrabold leading-tight text-slate-900">গত ৭ দিনের ট্রেন্ড</h2>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">270</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 lg:p-6">
            <svg viewBox="0 0 100 70" className="h-52 w-full lg:h-64" role="img" aria-label="Sales trend chart">
              <defs>
                <linearGradient id="sellerTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity="0.03" />
                </linearGradient>
              </defs>

              {[10, 22, 34, 46, 58].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#e2e8f0" strokeWidth="0.6" />
              ))}

              <polyline fill="url(#sellerTrend)" points={`0,70 ${linePoints} 100,70`} />
              <polyline fill="none" points={linePoints} stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

              {trendPoints.map((point, index) => {
                const x = (index / (trendPoints.length - 1)) * 100;
                const y = 70 - (point / 100) * 60;
                return <circle key={trendLabels[index]} cx={x} cy={y} r="1.8" fill="#f97316" />;
              })}

              {trendLabels.map((label, index) => {
                const x = (index / (trendLabels.length - 1)) * 100;
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
              <p className="bangla-font text-[10px] font-semibold text-slate-400">সাম্প্রতিক অর্ডার</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">Recent Orders</h2>
            </div>
            <button type="button" className="text-xs font-semibold text-slate-500">
              See all
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
                      Amount: <span className="font-semibold text-slate-900">{money(order.amount)}</span>
                    </p>
                    <p>Time: {order.time}</p>
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
              <p className="bangla-font text-[10px] font-semibold text-slate-400">ইনভেন্টরি</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">Stock Overview</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">{filteredInventory.length} items</span>
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
            Syncing dashboard data...
          </div>
        ) : null}

      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-3 py-3">
        <ul className="mx-auto grid w-full max-w-[1400px] grid-cols-5 gap-1 lg:px-4">
          {bottomTabs.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`relative flex w-full items-center justify-center px-2 py-2 transition ${isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="scale-125 lg:scale-150">{iconFor(item.icon)}</span>
                  {isActive ? <span className="absolute -bottom-3 h-[3px] w-10 rounded-full bg-orange-500" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
