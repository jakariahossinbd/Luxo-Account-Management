import React from "react";

const defaultSummaryCards = [
  { label: "Today Sales", value: "$2,840", change: "+8.1%" },
  { label: "Orders", value: "94", change: "+5.4%" },
  { label: "Visitors", value: "1,320", change: "+11.2%" },
];

const defaultRecentOrders = [
  { id: "#9321", customer: "Ava Wilson", amount: "$120.00", status: "Paid" },
  { id: "#9317", customer: "Noah Ahmed", amount: "$86.50", status: "Shipped" },
  { id: "#9312", customer: "Emma Khan", amount: "$44.20", status: "Pending" },
];

const defaultBottomNav = [
  { key: "home", label: "Home" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "profile", label: "Profile" },
];

function NavIcon({ name, active }) {
  const color = active ? "currentColor" : "none";

  if (name === "orders") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color} stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <line x1="7" y1="9" x2="17" y2="9" />
        <line x1="7" y1="13" x2="17" y2="13" />
      </svg>
    );
  }

  if (name === "products") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color} stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8 12 3l8 5-8 5-8-5Z" />
        <path d="M4 8v8l8 5 8-5V8" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color} stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.8-3.6 4.8-5.4 8-5.4 3.2 0 6.2 1.8 8 5.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={color} stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5V21H3v-9.5Z" />
      <path d="M9 21v-5h6v5" />
    </svg>
  );
}

export default function SellerAppMobile({
  sellerName = "Ariyan Store",
  greeting = "Good evening",
  summaryCards = defaultSummaryCards,
  recentOrders = defaultRecentOrders,
  bottomNav = defaultBottomNav,
  activeTab = "home",
  onTabChange,
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-100 pb-24 text-slate-900">
      <div className="px-4 pt-4">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 p-5 text-white shadow-xl shadow-cyan-600/30">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">{greeting}</p>
          <h1 className="mt-2 text-2xl font-black">{sellerName}</h1>
          <p className="mt-2 text-sm text-cyan-100">Your shop performance looks healthy today.</p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            View Analytics
          </button>
        </div>
      </div>

      <section className="mt-4 grid gap-3 px-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-300/20">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-extrabold text-slate-900">{card.value}</p>
              <p className="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">{card.change}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-5 px-4">
        <div className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-300/20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Orders</h2>
            <button type="button" className="text-xs font-semibold text-cyan-700">
              See all
            </button>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{order.id}</p>
                  <p className="text-xs text-slate-500">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{order.amount}</p>
                  <p className="text-xs font-semibold text-cyan-700">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-slate-200 bg-white/95 px-2 pb-4 pt-2 backdrop-blur">
        <ul className="grid grid-cols-4 gap-1">
          {bottomNav.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onTabChange?.(item.key)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                    isActive ? "bg-cyan-50 text-cyan-700" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <NavIcon name={item.key} active={isActive} />
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
