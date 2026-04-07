'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FileText, Package, Home, Users, User } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      href: '/admin/accounting',
      icon: FileText,
      shortLabel: 'Accounts',
    },
    {
      href: '/admin/products',
      icon: Package,
      shortLabel: 'Products',
    },
    {
      href: '/admin',
      icon: Home,
      shortLabel: 'HOME',
      isCenter: true,
    },
    {
      href: '/admin/sales',
      icon: Users,
      shortLabel: 'Customers Led',
    },
    {
      href: '/admin/seller-manage',
      icon: User,
      shortLabel: 'Saller Manage',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 border-t border-slate-200 bg-white px-3 py-1.5 safe-area-inset-bottom">
      <ul className="relative mx-auto grid h-14 w-full grid-cols-5 items-center gap-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isCenter ? pathname === '/admin' : pathname.startsWith(item.href);
          const isCenter = item.isCenter;

          return (
            <li
              key={item.href}
              className={`flex justify-center ${isCenter ? 'relative -top-4' : 'h-full items-center'}`}
            >
              {isCenter ? (
                <button
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="relative flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-xl shadow-orange-300/40 transition hover:shadow-orange-400/50 active:scale-95"
                >
                  <Icon className="w-5 h-5 scale-110" />
                  <span className="text-[9px] font-bold text-white mt-1">
                    {item.shortLabel}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 py-0 transition ${
                    isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {isActive && <span className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-orange-500" />}
                  <Icon className="w-5 h-5 scale-125" />
                  <span className="max-w-[88px] truncate whitespace-nowrap text-center text-[9px] font-semibold leading-tight">
                    {item.shortLabel}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
