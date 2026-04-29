'use client';

import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

export interface GlassMorphismSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function GlassMorphismSidebar({ isOpen = true, onClose }: GlassMorphismSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const currentPath = pathname ?? '';

  const panelToneClass = isDark
    ? 'from-slate-900/66 via-slate-900/58 to-slate-800/64 border-white/12 shadow-[0_14px_34px_rgba(2,6,23,0.45)]'
    : 'from-white/77 via-slate-50/71 to-white/69 border-white/48 shadow-[0_10px_30px_rgba(2,6,23,0.10)]';

  const labelClass = isDark ? 'text-slate-200' : 'text-slate-700';
  const inactiveIconClass = isDark ? 'text-slate-200/90' : 'text-slate-600';

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
      {isOpen && (
        <div
          className={`fixed inset-0 z-20 backdrop-blur-sm lg:hidden ${isDark ? 'bg-black/60' : 'bg-slate-900/35'}`}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-[73px] z-30 h-[calc(100vh-73px)] w-64 overflow-y-auto transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        bg-gradient-to-b border-r backdrop-blur-xl ${panelToneClass}`}
      >
        <nav className="space-y-1 p-4 pb-24 lg:p-6 lg:pb-10">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMenuItemActive(item.href);
            const isExpanded = expandedMenu === item.id;

            return (
              <div key={item.id} className="relative">
                <button
                  onClick={() => {
                    router.push(item.href);
                    if (onClose) onClose();
                  }}
                  className={`
                    w-full flex items-center gap-3 rounded-xl px-4 py-3 pr-11 text-left
                    transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    ${isActive
                      ? `${isDark ? 'bg-gradient-to-r from-orange-500/26 via-orange-400/18 to-amber-300/12 text-orange-50 border-orange-200/34' : 'bg-gradient-to-r from-orange-500/24 via-orange-400/16 to-amber-300/10 text-orange-700 border-orange-300/40'} border font-semibold`
                      : `${labelClass} hover:bg-gradient-to-r hover:from-orange-500/12 hover:via-orange-400/8 hover:to-amber-300/6 border border-transparent ${isDark ? 'hover:text-slate-100 hover:border-orange-200/24' : 'hover:border-orange-200/36'}`
                    }
                  `}
                  style={{
                    ...(isActive && {
                      boxShadow: 'inset 0 0 20px rgba(251, 146, 60, 0.18), 0 0 18px rgba(249, 115, 22, 0.14)',
                    }),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                  }}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition-all duration-300 ${isActive ? (isDark ? 'text-orange-100' : 'text-orange-600') : inactiveIconClass}`} />
                  <span className="flex-1 truncate text-sm font-medium leading-tight" title={item.label}>{item.label}</span>
                </button>

                {item.submenu && (
                  <button
                    type="button"
                    onClick={() => setExpandedMenu(isExpanded ? null : item.id)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition ${isDark ? 'text-slate-200/80 hover:bg-white/10' : 'text-slate-600 hover:bg-black/5'}`}
                    aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      } ${isActive ? (isDark ? 'text-orange-100' : 'text-orange-600') : (isDark ? 'text-slate-200/80' : 'text-slate-600')}`}
                    />
                  </button>
                )}

                {item.submenu && isExpanded && (
                  <div className="relative mt-2 ml-2 space-y-1 border-l border-orange-200/30 pl-3 lg:border-orange-200/32">
                    <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-orange-300/85 via-orange-400/50 to-transparent" />
                    <div className="pointer-events-none absolute -left-1 top-0 bottom-0 w-3 rounded-full bg-orange-300/10 blur-sm" />

                    {item.submenu.map((subitem) => (
                      <Link
                        key={subitem.href}
                        href={subitem.href}
                        className={`
                          block truncate rounded-lg px-4 py-2 text-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                          ${
                            currentPath === subitem.href
                              ? `${isDark ? 'bg-gradient-to-r from-orange-500/24 via-orange-400/16 to-amber-300/10 text-orange-50 border-orange-200/30' : 'bg-gradient-to-r from-orange-500/20 via-orange-400/14 to-amber-300/10 text-orange-700 border-orange-300/34'} font-semibold border shadow-[inset_0_0_16px_rgba(251,146,60,0.16)]`
                              : `${isDark ? 'text-slate-200/80 hover:text-slate-100 hover:border-orange-200/20' : 'text-slate-600 hover:text-slate-800 hover:border-orange-200/24'} hover:bg-gradient-to-r hover:from-orange-500/12 hover:via-orange-400/8 hover:to-amber-300/6 border border-transparent`
                          }
                        `}
                        title={subitem.label}
                        onClick={onClose}
                        onMouseEnter={(e) => {
                          if (currentPath !== subitem.href) {
                            (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                        }}
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
