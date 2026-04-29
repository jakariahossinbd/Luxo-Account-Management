'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTranslation } from '@/hooks/useTranslation';

type Sale = {
  id: string;
  orderId: string;
  invoiceNumber?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
};

export default function SalesPaymentsPage() {
  const { t } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSales() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/sales?limit=1000', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) {
          setSales(payload.data || []);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSales();

    return () => {
      active = false;
    };
  }, []);

  const payments = useMemo(
    () => sales.filter((sale) => sale.paymentStatus === 'PAID' || sale.paymentStatus === 'PARTIAL'),
    [sales]
  );

  const pending = useMemo(
    () => sales.filter((sale) => sale.paymentStatus === 'PENDING'),
    [sales]
  );

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.salesPayment.payments')}</h1>
            <p className="mt-2 text-slate-600">{t('admin.salesPayment.managementSubtitle')}</p>
          </div>
          <Link href="/admin/sales" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {t('common.back')}
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.salesPayment.paidOrders')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{payments.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.salesPayment.pendingPayments')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pending.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.salesPayment.totalAmount')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(payments.reduce((sum, sale) => sum + sale.total, 0))}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('admin.salesPayment.payments')}</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-600">{t('messages.loadingData')}</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t('admin.salesPayment.noSalesData')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.orderId')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.invoices')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.totalAmount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((sale) => (
                    <tr key={sale.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">{sale.orderId}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sale.invoiceNumber || '-'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatTaka(sale.total)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sale.paymentStatus}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(sale.createdAt).toLocaleDateString('en-BD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}