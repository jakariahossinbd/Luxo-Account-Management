'use client';

import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Users,
  DollarSign,
  PlugZap,
} from 'lucide-react';
import { useState } from 'react';
import { useThemeStore } from '@/store/theme';

export interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = true, onClose }: AdminSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const currentPath = pathname ?? '';

  const menuItems = [
    {
      id: 'sales-payment',
      label: t('admin.menu.salesPayment'),
      icon: DollarSign,
      href: '/admin/sales',
      submenu: [
        { label: t('admin.salesPayment.sales'), href: '/admin/sales' },
        { label: t('admin.salesPayment.payments'), href: '/admin/sales/payments' },
        { label: t('admin.salesPayment.invoices'), href: '/admin/sales/invoices' },
        { label: t('admin.salesPayment.returns'), href: '/admin/sales/returns' },
      ],
    },
    {
      id: 'purchase',
      label: t('admin.menu.purchase'),
      icon: ShoppingCart,
      href: '/admin/purchase',
      submenu: [
        { label: t('admin.purchase.suppliers'), href: '/admin/purchase/suppliers' },
        { label: t('admin.purchase.purchaseOrders'), href: '/admin/purchase' },
      ],
    },
    {
      id: 'product-service',
      label: t('admin.menu.productService'),
      icon: Package,
      href: '/admin/products',
      submenu: [
        { label: t('admin.productService.products'), href: '/admin/products' },
        { label: t('admin.productService.services'), href: '/admin/products/services' },
        { label: t('admin.productService.categories'), href: '/admin/products/categories' },
        { label: t('admin.productService.inventory'), href: '/admin/products/inventory' },
      ],
    },
    {
      id: 'accounting',
      label: t('admin.menu.accounting'),
      icon: FileText,
      href: '/admin/accounting',
      submenu: [
        { label: t('admin.accounting.transactions'), href: '/admin/accounting' },
        { label: t('admin.accounting.expenses'), href: '/admin/accounting/expenses' },
        { label: t('admin.accounting.income'), href: '/admin/accounting/income' },
      ],
    },
    {
      id: 'reports',
      label: t('admin.menu.reports'),
      icon: BarChart3,
      href: '/admin/reports',
      submenu: [
        { label: t('admin.reports.sales'), href: '/admin/reports/sales' },
        { label: t('admin.reports.inventory'), href: '/admin/reports/inventory' },
        { label: t('admin.reports.financial'), href: '/admin/reports/financial' },
      ],
    },
    {
      id: 'seller-manage',
      label: t('admin.menu.sellerManage'),
      icon: Users,
      href: '/admin/seller-manage',
      submenu: [
        { label: t('admin.sellerManage.sellers'), href: '/admin/seller-manage' },
        { label: t('admin.sellerManage.details'), href: '/admin/seller-manage/details' },
        { label: t('admin.sellerManage.stats'), href: '/admin/seller-manage/stats' },
      ],
    },
    {
      id: 'integrations',
      label: t('admin.menu.integrations'),
      icon: PlugZap,
      href: '/admin/integrations/courier',
      submenu: [
        { label: t('admin.integrations.courier'), href: '/admin/integrations/courier' },
        { label: t('admin.integrations.sms'), href: '/admin/integrations/sms' },
      ],
    },
  ];

  const isMenuItemActive = (href: string) => {
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-20 backdrop-blur-sm lg:hidden ${isDark ? 'bg-black/55' : 'bg-slate-900/35'}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-[73px] z-30 h-[calc(100vh-73px)] w-64 overflow-y-auto border-r backdrop-blur-xl transition-transform duration-300 ${isDark ? 'border-white/10 bg-slate-900/62 shadow-[0_14px_34px_rgba(2,6,23,0.45)]' : 'border-white/53 bg-white/77 shadow-[0_10px_30px_rgba(2,6,23,0.10)]'} lg:left-0 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <nav className="space-y-1 p-4 lg:p-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMenuItemActive(item.href);
            const isExpanded = expandedMenu === item.id;

            return (
              <div key={item.id}>
                <button
                  onClick={() => setExpandedMenu(isExpanded ? null : item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${isActive
                    ? `${isDark ? 'bg-orange-400/18 text-orange-200' : 'bg-orange-500/15 text-orange-600'} font-semibold`
                    : `${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-white/65'}`
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.submenu && (
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>

                {/* Submenu */}
                {item.submenu && isExpanded && (
                  <div className="mt-1 ml-2 space-y-1 border-l-2 border-slate-200 pl-3">
                    {item.submenu.map((subitem) => (
                      <Link
                        key={subitem.href}
                        href={subitem.href}
                        className={`block rounded px-4 py-2 text-sm transition ${
                          currentPath === subitem.href
                            ? `${isDark ? 'bg-orange-400/20 text-orange-100' : 'bg-orange-500/18 text-orange-700'} font-semibold`
                            : `${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-white/65'}`
                        }`}
                      >
                        {subitem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
