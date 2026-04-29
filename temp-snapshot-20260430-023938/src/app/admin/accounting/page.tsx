'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { CreateExpenseModal } from '@/components/features/accounting/CreateExpenseModal';
import { useTranslation } from '@/hooks/useTranslation';

interface Expense {
  id: string;
  categoryId: string;
  employeeId: string;
  amount: number;
  description: string;
  paymentMethod: string;
  paymentStatus: string;
  date: string;
  category?: { name: string };
  createdAt: string;
}

interface PaginationData {
  data: Expense[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function AccountingPage() {
  const { t } = useTranslation();
  const { success, error: toastError, info } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/accounting?page=${page}&limit=10`);
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      const data: PaginationData = await response.json();
      setExpenses(data.data);
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
    void fetchExpenses();
  }, [fetchExpenses]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchExpenses(newPage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.accounting.deleteConfirm'))) {
      info(t('admin.accounting.deleteCancelled'));
      return;
    }
    try {
      const response = await fetch(`/api/admin/accounting?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      success(t('admin.accounting.deleteSuccess'));
      fetchExpenses(pagination.page);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('messages.operationFailed'));
    }
  };

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-BD');

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidExpenses = expenses.filter(e => e.paymentStatus === 'PAID').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.paymentStatus === 'PENDING').reduce((sum, e) => sum + e.amount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.accounting.managementTitle')}</h1>
            <p className="mt-2 text-slate-600">{t('admin.accounting.managementSubtitle')}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            {t('admin.accounting.newExpense')}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.accounting.totalExpenses')}</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{formatTaka(totalExpenses)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.accounting.paidExpenses')}</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{formatTaka(paidExpenses)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.accounting.pendingExpenses')}</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{formatTaka(pendingExpenses)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.accounting.totalRecords')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pagination.total}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('admin.accounting.expenseRecords')}</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-600">{t('messages.loadingData')}</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t('admin.accounting.noExpenseRecords')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.description')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.productService.category')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.amount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.paymentMethod')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.paymentStatus')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">{expense.description}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{expense.category?.name || t('admin.accounting.unknown')}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatTaka(expense.amount)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{expense.paymentMethod}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          expense.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : expense.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {expense.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(expense.date || expense.createdAt)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-700" title={t('common.edit')}>
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(expense.id)} className="text-red-600 hover:text-red-700" title={t('common.delete')}>
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
              {t('admin.accounting.showing')} {expenses.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} {t('admin.accounting.to')} {Math.min(pagination.page * pagination.limit, pagination.total)} {t('admin.accounting.of')} {pagination.total}
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

        <CreateExpenseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchExpenses(1)}
        />
      </div>
    </AdminLayout>
  );
}
