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
} from 'lucide-react';
import { useState } from 'react';

export interface GlassMorphismSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function GlassMorphismSidebar({ isOpen = true, onClose }: GlassMorphismSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
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
  ];

  const isMenuItemActive = (href: string) => {
    return currentPath.startsWith(href);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-[72px] z-30 h-[calc(100vh-72px)] w-64 overflow-y-auto transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        bg-gradient-to-b from-slate-900/62 via-slate-900/52 to-slate-800/62 lg:from-slate-900/82 lg:via-slate-800/76 lg:to-slate-900/84 backdrop-blur-xl border-r border-white/15 lg:border-white/12 shadow-[0_10px_30px_rgba(2,6,23,0.16)]`}
      >
        <style jsx>{`
          aside {
            background-color: rgba(15, 23, 42, 0.72);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.14),
              inset 0 -1px 0 rgba(255, 255, 255, 0.05),
              -10px 0 30px rgba(2, 6, 23, 0.34);
            background-image:
              radial-gradient(circle at 16% 8%, rgba(255, 255, 255, 0.13), transparent 35%),
              radial-gradient(circle at 90% 90%, rgba(249, 115, 22, 0.08), transparent 32%);
            -webkit-backdrop-filter: blur(20px) saturate(120%);
            backdrop-filter: blur(20px) saturate(120%);
          }

          @media (min-width: 1024px) {
            aside {
              background-color: rgba(15, 23, 42, 0.80);
              -webkit-backdrop-filter: blur(16px) saturate(120%);
              backdrop-filter: blur(16px) saturate(120%);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.10),
                inset 0 -1px 0 rgba(2, 6, 23, 0.24),
                10px 0 30px rgba(2, 6, 23, 0.22);
              background-image:
                linear-gradient(180deg, rgba(15, 23, 42, 0.24) 0%, rgba(15, 23, 42, 0.12) 50%, rgba(15, 23, 42, 0.20) 100%),
                radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.06), transparent 32%),
                radial-gradient(circle at 90% 90%, rgba(249, 115, 22, 0.05), transparent 30%);
            }
          }

          aside::-webkit-scrollbar {
            width: 6px;
          }

          aside::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }

          aside::-webkit-scrollbar-thumb {
            background: rgba(249, 115, 22, 0.3);
            border-radius: 3px;
          }

          aside::-webkit-scrollbar-thumb:hover {
            background: rgba(249, 115, 22, 0.6);
          }
        `}</style>

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
                      ? 'bg-gradient-to-r from-orange-500/30 via-orange-400/20 to-amber-300/12 text-white border border-orange-200/40 font-semibold'
                      : 'text-slate-100 hover:bg-gradient-to-r hover:from-orange-500/14 hover:via-orange-400/10 hover:to-amber-300/6 border border-transparent hover:border-orange-200/28 lg:text-white lg:hover:border-orange-200/24'
                    }
                  `}
                  style={{
                    ...(isActive && {
                      boxShadow: 'inset 0 0 20px rgba(251, 146, 60, 0.18), 0 0 18px rgba(249, 115, 22, 0.14)',
                    }),
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition-all duration-300 ${isActive ? 'text-orange-100' : 'text-slate-100/85 lg:text-white/88'}`} />
                  <span className="flex-1 truncate text-sm font-medium leading-tight" title={item.label}>{item.label}</span>
                </button>

                {item.submenu && (
                  <button
                    type="button"
                    onClick={() => setExpandedMenu(isExpanded ? null : item.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-100/75 transition hover:bg-white/10 lg:text-white/78"
                    aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      } ${isActive ? 'text-orange-100' : 'text-slate-100/75 lg:text-white/78'}`}
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
                              ? 'bg-gradient-to-r from-orange-500/26 via-orange-400/18 to-amber-300/10 text-orange-50 font-semibold border border-orange-200/34 shadow-[inset_0_0_16px_rgba(251,146,60,0.22)]'
                              : 'text-slate-100/75 hover:text-slate-100 hover:bg-gradient-to-r hover:from-orange-500/12 hover:via-orange-400/8 hover:to-amber-300/6 border border-transparent hover:border-orange-200/22 lg:text-white lg:hover:text-white lg:hover:border-orange-200/20'
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
