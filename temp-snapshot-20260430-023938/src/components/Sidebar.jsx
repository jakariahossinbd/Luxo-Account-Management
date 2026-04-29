"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const defaultLinks = [
  { label: "Dashboard", href: "/" },
  { label: "Staff", href: "/staff" },
  { label: "Sales", href: "/sales" },
  { label: "Reports", href: "/reports" },
];

export default function Sidebar({
  brand = "Luxo SaaS",
  title = "Seller Console",
  links = defaultLinks,
}) {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-3xl border border-slate-200/70 bg-white/75 p-5 shadow-xl shadow-slate-300/30 backdrop-blur xl:w-72">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-extrabold text-white">
          LX
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">{brand}</p>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>
      </div>

      <nav className="space-y-2">
        {links.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href || "#"}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-400/40"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{item.label}</span>
              {isActive && <span className="h-2 w-2 rounded-full bg-cyan-300" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">System Health</p>
        <p className="mt-2 text-2xl font-extrabold text-slate-900">98.2%</p>
        <p className="mt-1 text-sm text-slate-600">All services are operating normally.</p>
      </div>
    </aside>
  );
}