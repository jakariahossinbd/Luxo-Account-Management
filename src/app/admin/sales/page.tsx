'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Eye, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { CreateSaleModal } from '@/components/features/sales/CreateSaleModal';
import { SaleDetailsModal } from '@/components/features/sales/SaleDetailsModal';
import { useTranslation } from '@/hooks/useTranslation';

interface Sale {
  id: string;
  orderId: string;
  customerId: string;
  employeeId: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: string;
  status: string;
  invoiceNumber?: string;
  createdAt: string;
}

interface PaginationData {
  data: Sale[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function SalesPage() {
  const { t } = useTranslation();
  const { success, error: toastError, info } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const fetchSales = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/sales?page=${page}&limit=10`);
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      const data: PaginationData = await response.json();
      setSales(data.data);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        pages: data.pagination.pages,
        total: data.pagination.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('messages.operationFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchSales(newPage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.salesPayment.deleteConfirm'))) {
      info(t('admin.salesPayment.deleteCancelled'));
      return;
    }
    try {
      const response = await fetch(`/api/admin/sales?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      success(t('admin.salesPayment.deleteSuccess'));
      fetchSales(pagination.page);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('messages.operationFailed'));
    }
  };

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-BD');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.salesPayment.managementTitle')}</h1>
            <p className="mt-2 text-slate-600">{t('admin.salesPayment.managementSubtitle')}</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            {t('admin.salesPayment.create')}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.salesPayment.totalSales')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(sales.reduce((sum, s) => sum + s.total, 0))}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.salesPayment.totalOrders')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pagination.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.salesPayment.paidOrders')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{sales.filter(s => s.paymentStatus === 'PAID').length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.salesPayment.pendingPayments')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{sales.filter(s => s.paymentStatus === 'PENDING').length}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('admin.salesPayment.list')}</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-600">{t('messages.loadingData')}</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t('admin.salesPayment.noSalesData')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.orderId')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.invoices')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.subtotal')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.discount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.totalAmount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.payments')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">{sale.orderId}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sale.invoiceNumber || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatTaka(sale.subtotal)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatTaka(sale.discount)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatTaka(sale.total)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          sale.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          sale.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(sale.createdAt)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSaleId(sale.id)}
                            className="text-emerald-600 hover:text-emerald-700"
                            title={t('admin.salesPayment.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-blue-600 hover:text-blue-700" title={t('common.edit')}>
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(sale.id)} className="text-red-600 hover:text-red-700" title={t('common.delete')}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <div className="text-sm text-slate-600">
              {t('admin.accounting.showing')} {sales.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} {t('admin.accounting.to')} {Math.min(pagination.page * pagination.limit, pagination.total)} {t('admin.accounting.of')} {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      page === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <CreateSaleModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => fetchSales(1)}
        />

        <SaleDetailsModal
          saleId={selectedSaleId}
          isOpen={selectedSaleId !== null}
          onClose={() => setSelectedSaleId(null)}
        />
      </div>
    </AdminLayout>
  );
}
