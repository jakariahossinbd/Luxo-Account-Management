'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';

interface Seller {
  id: string;
  userId: string;
  employeeCode?: string;
  user?: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  status: boolean;
  createdAt: string;
}

interface PaginationData {
  data: Seller[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function SellerManagePage() {
  const { t } = useTranslation();
  const { success, error: toastError, info } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSellers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/seller-manage?page=${page}&limit=10`);
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      const data: PaginationData = await response.json();
      setSellers(data.data);
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
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchSellers(newPage);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/seller-manage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: !currentStatus }),
      });
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      success(t('admin.sellerManage.statusUpdateSuccess'));
      fetchSellers(pagination.page);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('messages.operationFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.sellerManage.deleteConfirm'))) {
      info(t('admin.sellerManage.deleteCancelled'));
      return;
    }
    try {
      const response = await fetch(`/api/admin/seller-manage`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      success(t('admin.sellerManage.deleteSuccess'));
      fetchSellers(pagination.page);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('messages.operationFailed'));
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-BD');

  const activeSellers = sellers.filter(s => s.status).length;
  const inactiveSellers = sellers.filter(s => !s.status).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('admin.sellerManage.managementTitle')}</h1>
          <p className="mt-2 text-slate-600">{t('admin.sellerManage.managementSubtitle')}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.sellerManage.totalSellers')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pagination.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.sellerManage.activeSellers')}</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{activeSellers}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.sellerManage.inactiveSellers')}</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{inactiveSellers}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.sellerManage.totalSellers')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pagination.total}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('admin.sellerManage.list')}</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-600">{t('messages.loadingData')}</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : sellers.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t('admin.sellerManage.noSellersData')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.sellerManage.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('auth.email')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.sellerManage.phone')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.sellerManage.employeeCode')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.salesPayment.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.sellerManage.joinedDate')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{seller.user?.name || t('admin.accounting.unknown')}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{seller.user?.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{seller.user?.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{seller.employeeCode || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleStatusToggle(seller.id, seller.status)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            seller.status ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {seller.status ? t('admin.sellerManage.active') : t('admin.sellerManage.inactive')}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(seller.createdAt)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-700" title={t('common.edit')}>
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(seller.id)} className="text-red-600 hover:text-red-700" title={t('common.delete')}>
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
              {t('admin.accounting.showing')} {sellers.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} {t('admin.accounting.to')} {Math.min(pagination.page * pagination.limit, pagination.total)} {t('admin.accounting.of')} {pagination.total}
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
      </div>
    </AdminLayout>
  );
}
