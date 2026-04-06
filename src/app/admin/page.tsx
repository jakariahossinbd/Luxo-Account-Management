"use client";

import { AdminLayout } from '@/components/layout/AdminLayout';
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

  const modules = [
    {
      title: t('admin.menu.salesPayment', language),
      description: t('admin.menuDescriptions.salesPayment', language),
      icon: DollarSign,
      href: '/admin/sales',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: t('admin.menu.purchase', language),
      description: t('admin.menuDescriptions.purchase', language),
      icon: ShoppingCart,
      href: '/admin/purchase',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: t('admin.menu.productService', language),
      description: t('admin.menuDescriptions.productService', language),
      icon: Package,
      href: '/admin/products',
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: t('admin.menu.accounting', language),
      description: t('admin.menuDescriptions.accounting', language),
      icon: FileText,
      href: '/admin/accounting',
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: t('admin.menu.reports', language),
      description: t('admin.menuDescriptions.reports', language),
      icon: BarChart3,
      href: '/admin/reports',
      color: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
    },
    {
      title: t('admin.menu.sellerManage', language),
      description: t('admin.menuDescriptions.sellerManage', language),
      icon: Users,
      href: '/admin/seller-manage',
      color: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">{t('admin.dashboard', language)}</h1>
          <p className="mt-2 text-lg text-slate-600">{t('admin.home.welcome', language)}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href}>
                <div className={`${module.color} rounded-lg border border-slate-200 p-6 shadow-sm transition hover:shadow-md cursor-pointer`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{module.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{module.description}</p>
                    </div>
                    <div className={`rounded-full p-3 ${module.color}`}>
                      <Icon className={`h-6 w-6 ${module.iconColor}`} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t('admin.home.quickStats', language)}</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-600">{t('admin.home.totalSales', language)}</p>
                <p className="font-semibold text-slate-900">৳0</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-slate-600">{t('admin.home.totalOrders', language)}</p>
                <p className="font-semibold text-slate-900">0</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-slate-600">{t('admin.home.activeSellers', language)}</p>
                <p className="font-semibold text-slate-900">0</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t('seller.recentActivities', language)}</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-600">{t('admin.home.noRecentActivities', language)}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}