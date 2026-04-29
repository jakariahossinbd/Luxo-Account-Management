import React from "react";

const defaultStats = [
  { label: "Revenue", value: "$84,220", delta: "+14.2%" },
  { label: "Active Users", value: "12,941", delta: "+7.8%" },
  { label: "New Orders", value: "1,286", delta: "+9.4%" },
  { label: "Refund Rate", value: "1.09%", delta: "-0.4%" },
];

const defaultBars = [52, 68, 40, 77, 63, 88, 72];

export default function AdminDashboard({
  title = "SaaS Admin Dashboard",
  subtitle = "Track performance, revenue, and user growth in real time.",
  stats = defaultStats,
  bars = defaultBars,
}) {
  return (
    <main className="mt-4 flex-1 min-w-0 font-[Manrope] text-slate-900 md:mt-0">
      <div className="mb-6 flex flex-col gap-5 rounded-3xl border border-slate-200/70 bg-white/75 p-5 shadow-xl shadow-slate-300/30 backdrop-blur sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-700 sm:text-xs">Overview</p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-[2rem]">
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-[15px]">{subtitle}</p>
        </div>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 sm:w-auto"
        >
          Export Report
        </button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
        {stats.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20 sm:p-5"
          >
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900 sm:mt-3">{item.value}</p>
            <p className="mt-2 text-sm font-bold text-cyan-700">{item.delta} this month</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-300/20 sm:p-6">
          <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
          <p className="mt-1 text-sm text-slate-500">Last 7 months performance</p>
          <div className="mt-5 overflow-hidden rounded-2xl bg-slate-50 p-3 sm:mt-6 sm:p-4">
            <svg viewBox="0 0 640 240" className="h-48 w-full sm:h-56" role="img" aria-label="Revenue trend chart">
              <defs>
                <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <g>
                {[40, 90, 140, 190].map((y) => (
                  <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="#e2e8f0" strokeWidth="1" />
                ))}
              </g>
              <polyline
                fill="none"
                stroke="url(#lineColor)"
                strokeWidth="5"
                strokeLinecap="round"
                points="20,180 105,150 190,155 275,100 360,120 445,70 530,78 620,35"
              />
              <polyline
                fill="rgba(6,182,212,0.12)"
                stroke="none"
                points="20,180 105,150 190,155 275,100 360,120 445,70 530,78 620,35 620,220 20,220"
              />
            </svg>
          </div>
        </article>

        <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-300/20 sm:p-6">
          <h3 className="text-lg font-bold text-slate-900">Traffic Sources</h3>
          <p className="mt-1 text-sm text-slate-500">Weekly acquisition split</p>
          <div className="mt-5 space-y-3 sm:mt-6">
            {bars.map((value, index) => (
              <div key={`${value}-${index}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <span>Source {index + 1}</span>
                  <span>{value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
