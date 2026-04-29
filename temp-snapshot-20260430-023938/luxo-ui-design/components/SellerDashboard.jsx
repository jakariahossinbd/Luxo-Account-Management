"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

const sidebarItems = [
  { key: "dashboard", label: "Dashboard", icon: "home" },
  { key: "orders", label: "Orders", icon: "orders" },
  { key: "products", label: "Products", icon: "products" },
  { key: "inventory", label: "Inventory", icon: "inventory" },
  { key: "reports", label: "Reports", icon: "reports" },
  { key: "settings", label: "Settings", icon: "settings" },
  { key: "help", label: "Help", icon: "help" },
];

const bottomTabs = [
  { key: "home", label: "Home", icon: "home" },
  { key: "orders", label: "Orders", icon: "orders" },
  { key: "customers", label: "Customers", icon: "customers" },
  { key: "profile", label: "Profile", icon: "profile" },
];

const fallbackOrders = [
  { id: "ORD-2051", customer: "Nusrat Jahan", amount: 9600, status: "Pending", time: "Just now" },
  { id: "ORD-2050", customer: "Rafiul Karim", amount: 15400, status: "Done", time: "11 min ago" },
  { id: "ORD-2048", customer: "Mim Akter", amount: 4100, status: "Cancel", time: "39 min ago" },
  { id: "ORD-2046", customer: "Mahim Rahman", amount: 8800, status: "Done", time: "1 hour ago" },
  { id: "ORD-2044", customer: "Tania Sultana", amount: 7200, status: "Pending", time: "2 hours ago" },
];

const fallbackInventory = [
  { code: "LX-BAG-1001", name: "Premium Handbag", stock: 18, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=240&q=60" },
  { code: "LX-SHOE-204", name: "Runner Shoes", stock: 7, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=240&q=60" },
  { code: "LX-WAT-412", name: "Classic Watch", stock: 0, image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=240&q=60" },
  { code: "LX-WAL-909", name: "Leather Wallet", stock: 33, image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=240&q=60" },
];

const trendPoints = [52, 61, 55, 70, 64, 82, 75];
const trendLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function money(value) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeStatus(status) {
  if (status === "Done" || status === "Confirmed" || status === "Shipped") return "Done";
  if (status === "Cancel" || status === "Cancelled") return "Cancel";
  return "Pending";
}

function getStatusTone(status) {
  if (status === "Done") return "bg-emerald-100 text-emerald-700";
  if (status === "Cancel") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

function iconFor(key) {
  switch (key) {
    case "orders":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M8 9h8M8 13h8" />
        </svg>
      );
    case "products":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 8 12 3l8 5-8 5-8-5Z" />
          <path d="M4 8v8l8 5 8-5V8" />
        </svg>
      );
    case "inventory":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M15 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-1.4 3.4 2 2 0 0 1-1.4-.6l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l.1.1a1.7 1.7 0 0 0 1.9.3h0A1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 0 2 2 0 0 1 0 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0A1.7 1.7 0 0 0 20.9 11H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    case "help":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v.01" />
          <path d="M9.8 9a2.5 2.5 0 1 1 3.8 2.1c-.9.5-1.6 1.1-1.6 2.4" />
        </svg>
      );
    case "customers":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="9" cy="8" r="3" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M3.5 19c.8-2.4 2.9-4 5.5-4s4.7 1.6 5.5 4" />
          <path d="M13 19c.4-1.8 1.8-3.1 3.7-3.3 1.3-.2 2.5.4 3.8 1.5" />
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

function SidebarContent({ onNavigate, activeItem }) {
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-base font-black text-white shadow-md shadow-blue-500/20">
          G
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Gemini Seller</p>
          <h2 className="text-lg font-extrabold leading-tight text-slate-900">Seller Console</h2>
        </div>
      </div>

      <nav className="space-y-2">
        {sidebarItems.map((item) => {
          const isActive = activeItem === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate?.(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"}`}>
                {iconFor(item.icon)}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-700">System Health</p>
        <p className="mt-2 text-3xl font-black text-slate-900">98.2%</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">All services are operating normally.</p>
      </div>
    </>
  );
}

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState(fallbackOrders);
  const [inventory, setInventory] = useState(fallbackInventory);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setLoadError("");

        const response = await fetch("/api/seller-dashboard", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load dashboard data (${response.status})`);
        }

        const payload = await response.json();
        if (Array.isArray(payload?.orders)) setOrders(payload.orders);
        if (Array.isArray(payload?.inventory)) setInventory(payload.inventory);
      } catch (error) {
        if (error?.name === "AbortError") return;
        setLoadError("API data unavailable. Showing fallback content.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
    return () => controller.abort();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const normalized = orders.map((order) => ({ ...order, status: normalizeStatus(order.status) }));
    if (!query) return normalized;
    return normalized.filter(
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
      (item) =>
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
    );
  }, [inventory, searchTerm]);

  const metrics = useMemo(() => {
    const pendingShipment = filteredOrders.filter((order) => order.status === "Pending").length;
    const activeListings = inventory.filter((item) => item.stock > 0).length;
    const inventoryAlerts = inventory.filter((item) => item.stock <= 5).length;

    return [
      { label: "New Orders", value: filteredOrders.length, icon: "orders" },
      { label: "Pending Shipment", value: pendingShipment, icon: "orders" },
      { label: "Active Listings", value: activeListings, icon: "products" },
      { label: "Inventory Alerts", value: inventoryAlerts, icon: "inventory" },
    ];
  }, [filteredOrders, inventory]);

  const chartWidth = 100;
  const chartHeight = 60;
  const linePoints = trendPoints
    .map((point, index) => {
      const x = (index / (trendPoints.length - 1)) * chartWidth;
      const y = chartHeight - (point / 100) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-0.5rem)] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(2,6,23,0.22)] sm:h-[calc(100dvh-2rem)] sm:rounded-[30px] lg:h-[calc(100dvh-2.5rem)] lg:max-w-none lg:rounded-[18px] lg:shadow-none">
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      ) : null}

      {drawerOpen ? (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[#dce6ef] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">Menu</span>
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
              Close
            </button>
          </div>
          <SidebarContent activeItem="dashboard" onNavigate={() => setDrawerOpen(false)} />
        </aside>
      ) : null}

      <header className="border-b border-slate-200 bg-white px-4 pt-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-900 transition active:scale-95"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-500">Seller Dashboard</p>
              <h1 className="text-base font-extrabold text-slate-900">Gemini Seller</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full ring-2 ring-orange-200">
                <Image
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=60"
                  alt="Rabeya Begum"
                  className="h-full w-full object-cover"
                  width={40}
                  height={40}
                  referrerPolicy="no-referrer"
                />
              </div>
              <button type="button" className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 6 3 9H3c0-3 3-2 3-9" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
              </button>
            </div>
          </div>

          <div className="pb-4 pt-3">
            <label className="flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2.5 shadow-sm shadow-orange-100/50">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="সার্চ প্রোডাক্ট বা অর্ডার..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto bg-slate-100 px-3 py-3 pb-6">
          <section className="grid grid-cols-2 gap-2.5">
            {metrics.map((metric, index) => (
              <article
                key={metric.label}
                className={`rounded-2xl p-3 text-white shadow-lg ${index % 2 === 0 ? "bg-gradient-to-br from-orange-500 to-orange-600" : "bg-gradient-to-br from-orange-400 to-orange-500"}`}
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

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">বিক্রয় ভিজ্যুয়ালাইজেশন</p>
                <h2 className="mt-1 text-base font-extrabold text-slate-900">গত ৭ দিনের ট্রেন্ড</h2>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">270</span>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <svg viewBox="0 0 100 70" className="h-44 w-full" role="img" aria-label="Sales trend chart">
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

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">সাম্প্রতিক অর্ডার</p>
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
                      {order.status === "Pending" ? "Pending" : order.status === "Done" ? "Done" : "Cancel"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-3 text-xs text-slate-500">
                    <div className="space-y-1">
                      <p>Amount: <span className="font-semibold text-slate-900">{money(order.amount)}</span></p>
                      <p>Time: {order.time}</p>
                    </div>
                    <div className="self-end text-right text-[11px] font-semibold text-slate-400">#{order.id.slice(-4)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ইনভেন্টরি</p>
                <h2 className="mt-1 text-base font-extrabold text-slate-900">Stock Overview</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">{filteredInventory.length} items</span>
            </div>

            <div className="space-y-2.5">
              {filteredInventory.slice(0, 4).map((item) => (
                <article key={item.code} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
                  <Image src={item.image} alt={item.name} className="h-11 w-11 rounded-xl object-cover" width={44} height={44} referrerPolicy="no-referrer" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.code}</p>
                  </div>
                  <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {item.stock > 0 ? `${item.stock} - In Stock` : "0 - Out of Stock"}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {isLoading ? (
            <div className="rounded-2xl bg-white p-3 text-center text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-100">
              Syncing dashboard data...
            </div>
          ) : null}

          {loadError ? (
            <div className="rounded-2xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-700 shadow-sm ring-1 ring-amber-200">
              {loadError}
            </div>
          ) : null}
      </main>

      <nav className="z-10 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur">
        <ul className="grid grid-cols-4 gap-1">
          {bottomTabs.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${isActive ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  {iconFor(item.icon)}
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}