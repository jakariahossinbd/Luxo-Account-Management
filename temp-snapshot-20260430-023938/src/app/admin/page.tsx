"use client";

import { AdminLayout } from '@/components/layout/AdminLayout';
import { WalletsSection } from '@/components/dashboard/WalletsSection';
import { InvoiceSection } from '@/components/dashboard/InvoiceSection';
import Link from 'next/link';
import { useLanguageStore } from '@/store/language';
import { t } from '@/lib/i18n';
import {
  DollarSign,
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Users,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { language } = useLanguageStore();
  const isBangla = language === 'bn';

  const modules = [
    {
      title: t('admin.menu.salesPayment', language),
      icon: DollarSign,
      href: '/admin/sales',
      shortTitle: isBangla ? 'বিক্রয়' : 'Sales & Pay',
      iconColor: 'text-emerald-500',
    },
    {
      title: t('admin.menu.purchase', language),
      icon: ShoppingCart,
      href: '/admin/purchase',
      shortTitle: isBangla ? 'ক্রয়' : 'Purchase',
      iconColor: 'text-violet-600',
    },
    {
      title: t('admin.menu.productService', language),
      icon: Package,
      href: '/admin/products',
      shortTitle: isBangla ? 'পণ্য' : 'Products',
      iconColor: 'text-blue-600',
    },
    {
      title: t('admin.menu.accounting', language),
      icon: FileText,
      href: '/admin/accounting',
      shortTitle: isBangla ? 'হিসাব' : 'Accounting',
      iconColor: 'text-amber-600',
    },
    {
      title: t('admin.menu.reports', language),
      icon: BarChart3,
      href: '/admin/reports',
      shortTitle: isBangla ? 'রিপোর্ট' : 'Report',
      iconColor: 'text-pink-500',
    },
    {
      title: t('admin.menu.sellerManage', language),
      icon: Users,
      href: '/admin/seller-manage',
      shortTitle: isBangla ? 'সেলার' : 'Seller',
      iconColor: 'text-cyan-500',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <WalletsSection />

        <div className="px-2 md:px-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.href} href={module.href}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:shadow-md cursor-pointer">
                    <div className="flex justify-center">
                      <Icon className={`h-9 w-9 ${module.iconColor}`} />
                    </div>
                    <h3 className="mt-3 text-[11px] font-semibold text-slate-700 leading-none whitespace-nowrap text-center">
                      {module.shortTitle || module.title}
                    </h3>
                  </div>
                </Link>
              );
            })}
            </div>
          </div>
        </div>

        <InvoiceSection />
      </div>
    </AdminLayout>
  );
}