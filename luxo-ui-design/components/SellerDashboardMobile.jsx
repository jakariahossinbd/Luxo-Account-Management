import React from "react";

const defaultCards = [
  { label: "Sales", value: "$12,480", note: "+12.4%" },
  { label: "Target", value: "83%", note: "$15k monthly" },
  { label: "Rating", value: "4.8", note: "1,294 reviews" },
];

const defaultBottomNav = [
  { key: "dashboard", label: "Dashboard" },
  { key: "staff", label: "Staff" },
  { key: "sales", label: "Sales" },
  { key: "reports", label: "Reports" },
];

function MobileNavIcon({ name, active }) {
  const fill = active ? "currentColor" : "none";

  if (name === "staff") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={fill} stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="9" r="3" />
        <circle cx="16" cy="10" r="2.5" />
        <path d="M3.5 19c.8-2.4 2.9-4 5.5-4s4.7 1.6 5.5 4" />
        <path d="M13 19c.4-1.8 1.8-3.1 3.7-3.3 1.3-.2 2.5.4 3.8 1.5" />
      </svg>
    );
  }

  if (name === "sales") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={fill} stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="11" width="3" height="8" rx="1" />
        <rect x="10.5" y="8" width="3" height="11" rx="1" />
        <rect x="17" y="5" width="3" height="14" rx="1" />
      </svg>
    );
  }

  if (name === "reports") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={fill} stroke="currentColor" strokeWidth="1.8">
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v5h5" />
        <line x1="9" y1="13" x2="16" y2="13" />
        <line x1="9" y1="17" x2="14" y2="17" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={fill} stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5V21H3v-9.5Z" />
      <path d="M9 21v-5h6v5" />
    </svg>
  );
}

export default function SellerDashboardMobile({
  storeName = "Luxo Seller",
  cards = defaultCards,
  navItems = defaultBottomNav,
  activeTab = "dashboard",
  onTabChange,
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-100 pb-24 text-slate-900">
      <header className="px-4 pt-4">
        <div className="rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-600 to-sky-700 p-5 text-white shadow-xl shadow-cyan-700/30">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Seller Dashboard</p>
          <h1 className="mt-2 text-2xl font-black">{storeName}</h1>
          <p className="mt-2 text-sm text-cyan-100">Monitor your daily performance and growth.</p>
        </div>
      </header>

      <main className="mt-4 space-y-3 px-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-300/20">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-extrabold text-slate-900">{card.value}</p>
              <p className="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">{card.note}</p>
            </div>
          </article>
        ))}
      </main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-slate-200 bg-white/95 px-2 pb-4 pt-2 backdrop-blur">
        <ul className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
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
                  <MobileNavIcon name={item.key} active={isActive} />
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