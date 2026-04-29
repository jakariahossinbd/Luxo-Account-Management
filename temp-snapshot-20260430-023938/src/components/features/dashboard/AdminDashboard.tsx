'use client';

import React from 'react';

interface StatItem {
  label: string;
  value: string;
  delta: string;
}

interface AdminDashboardProps {
  title?: string;
  subtitle?: string;
  stats?: StatItem[];
  bars?: number[];
}

const defaultStats: StatItem[] = [
  { label: 'Revenue', value: '$84,220', delta: '+14.2%' },
  { label: 'Active Users', value: '12,941', delta: '+7.8%' },
  { label: 'New Orders', value: '1,286', delta: '+9.4%' },
  { label: 'Refund Rate', value: '1.09%', delta: '-0.4%' },
];

const defaultBars = [52, 68, 40, 77, 63, 88, 72];

export default function AdminDashboard({
  title = 'SaaS Admin Dashboard',
  subtitle = 'Track performance, revenue, and user growth in real time.',
  stats = defaultStats,
  bars = defaultBars,
}: AdminDashboardProps) {
  return (
    <main className="mt-4 flex-1 font-[Manrope] text-slate-900 md:mt-0">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white/75 p-6 shadow-xl shadow-slate-300/30 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">
            Overview
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Export Report
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-300/20"
          >
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{item.value}</p>
            <p className="mt-2 text-sm font-bold text-cyan-700">{item.delta} this month</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/20">
          <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
          <p className="mt-1 text-sm text-slate-500">Last 7 months performance</p>
          <div className="mt-6 overflow-hidden rounded-2xl bg-slate-50 p-4">
            <svg
              viewBox="0 0 640 240"
              className="h-56 w-full"
              role="img"
              aria-label="Revenue trend chart"
            >
              <defs>
                <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <g>
                {[40, 90, 140, 190].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="640"
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
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

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/20">
          <h3 className="text-lg font-bold text-slate-900">Traffic Sources</h3>
          <p className="mt-1 text-sm text-slate-500">Weekly acquisition split</p>
          <div className="mt-6 space-y-3">
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
