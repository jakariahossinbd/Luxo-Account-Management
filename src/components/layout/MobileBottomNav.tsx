'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Package, Home, Users, User } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    {
      href: '/admin/accounting',
      icon: FileText,
      label: t('admin.accounting.title'),
      labelKey: 'admin.accounting.title',
    },
    {
      href: '/admin/products',
      icon: Package,
      label: t('admin.products.title'),
      labelKey: 'admin.products.title',
    },
    {
      href: '/admin',
      icon: Home,
      label: t('common.dashboard'),
      labelKey: 'common.dashboard',
      isHome: true,
    },
    {
      href: '/admin/sales',
      icon: Users,
      label: t('admin.salesPayment.title'),
      labelKey: 'admin.salesPayment.title',
    },
    {
      href: '/admin/seller-manage',
      icon: User,
      label: t('admin.sellerManage.title'),
      labelKey: 'admin.sellerManage.title',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-slate-200 safe-area-inset-bottom z-40">
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isHome ? pathname === '/admin' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600 border-t-2 border-orange-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="truncate max-w-[60px] text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
