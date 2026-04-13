'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FileText, Package, Home, Users, User } from 'lucide-react';

export function DesktopFooterNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      href: '/admin/accounting',
      icon: FileText,
      label: 'Accounting',
      isCenter: false,
    },
    {
      href: '/admin/products',
      icon: Package,
      label: 'Products',
      isCenter: false,
    },
    {
      href: '/admin',
      icon: Home,
      label: 'Dashboard',
      isCenter: true,
    },
    {
      href: '/admin/sales',
      icon: Users,
      label: 'Sales',
      isCenter: false,
    },
    {
      href: '/admin/seller-manage',
      icon: User,
      label: 'Sellers',
      isCenter: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 hidden border-t border-slate-200 bg-white shadow-sm md:block lg:left-64">
      <div className="mx-auto w-full max-w-[1920px] px-3 py-2 lg:pr-4">
        <ul className="relative mx-auto grid h-16 w-full max-w-[1400px] grid-cols-5 items-center gap-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            const isCenter = item.isCenter;

            if (isCenter) {
              return (
                <li key={item.href} className="relative -top-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => router.push(item.href)}
                    className="relative flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-2xl shadow-orange-300/40 transition hover:shadow-orange-400/50 active:scale-95"
                  >
                    <Icon className="h-5 w-5 scale-110" />
                    <span className="mt-1 text-[9px] font-bold whitespace-nowrap text-white">
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.href} className="flex h-full items-center justify-center">
                <button
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 py-0 transition ${
                    isActive
                      ? 'text-orange-500'
                      : 'text-slate-600 hover:text-slate-700'
                  }`}
                >
                  {isActive && <span className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-orange-500" />}
                  <Icon className="h-5 w-5 scale-125" />
                  <span className="max-w-[70px] truncate whitespace-nowrap text-center text-[9px] font-semibold leading-tight">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
