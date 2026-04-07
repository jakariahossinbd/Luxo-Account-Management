'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

type Supplier = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  companyName?: string | null;
  totalDue: number;
  status: boolean;
  createdAt: string;
};

type SupplierResponse = {
  success: boolean;
  data: Supplier[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const initialForm = {
  id: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  companyName: '',
};

const PAGE_SIZE = 20;

export default function PurchaseSuppliersPage() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);

  const isEdit = Boolean(form.id);

  const fetchSuppliers = async (page: number = 1, searchQuery: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(searchQuery.trim() ? { query: searchQuery.trim() } : {}),
      });
      const response = await fetch(`/api/admin/suppliers?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(t('admin.suppliers.loadingError'));
      const payload: SupplierResponse = await response.json();
      setSuppliers(payload.data || []);
      setPagination(payload.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.suppliers.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSuppliers(1, query);
  }, []);

  const onSearchChange = (value: string) => {
    setQuery(value);
    void fetchSuppliers(1, value);
  };

  const openCreate = () => {
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = (supplier: Supplier) => {
    setForm({
      id: supplier.id,
      name: supplier.name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      companyName: supplier.companyName || '',
    });
    setShowForm(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError(t('admin.suppliers.nameRequired'));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/admin/suppliers', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: form.id } : {}),
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          companyName: form.companyName,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || t('admin.suppliers.saveError'));
      }

      setShowForm(false);
      setForm(initialForm);
      await fetchSuppliers(pagination.page, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.suppliers.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    const ok = confirm(t('admin.suppliers.deleteConfirm'));
    if (!ok) return;

    try {
      setError(null);
      const response = await fetch(`/api/admin/suppliers?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(t('admin.suppliers.deleteError'));
      await fetchSuppliers(pagination.page, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.suppliers.deleteError'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.suppliers.title')}</h1>
            <p className="mt-2 text-slate-600">{t('admin.suppliers.description')}</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t('admin.suppliers.newSupplier')}
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('admin.suppliers.searchPlaceholder')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-600">{t('common.loading')}</div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t('admin.suppliers.noSuppliers')}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.suppliers.name')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.suppliers.phone')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.suppliers.email')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.suppliers.company')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.suppliers.status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.suppliers.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{supplier.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{supplier.phone}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{supplier.email || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{supplier.companyName || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${supplier.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {supplier.status ? t('admin.suppliers.active') : t('admin.suppliers.inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(supplier)} className="text-blue-600 hover:text-blue-700" title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => onDelete(supplier.id)} className="text-red-600 hover:text-red-700" title="Deactivate">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                <div className="text-sm text-slate-600">
                  {t('admin.accounting.showing')} {(pagination.page - 1) * pagination.limit + 1} {t('admin.accounting.to')} {Math.min(pagination.page * pagination.limit, pagination.total)} {t('admin.accounting.of')} {pagination.total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchSuppliers(pagination.page - 1, query)}
                    disabled={pagination.page <= 1 || loading}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('admin.suppliers.previous')}
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }).map((_, idx) => {
                      const page = idx + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => fetchSuppliers(page, query)}
                          className={`rounded-lg px-3 py-1 text-sm ${
                            pagination.page === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    {pagination.pages > 5 && <span className="px-2 text-slate-600">...</span>}
                  </div>
                  <button
                    onClick={() => fetchSuppliers(pagination.page + 1, query)}
                    disabled={pagination.page >= pagination.pages || loading}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('admin.suppliers.next')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {showForm ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEdit ? t('admin.suppliers.editTitle') : t('admin.suppliers.createTitle')}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-700">
                  {t('common.close')}
                </button>
              </div>
              <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.suppliers.name')}</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.suppliers.phone')}</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.suppliers.email')}</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.suppliers.company')}</label>
                    <input
                      value={form.companyName}
                      onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.suppliers.address')}</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {t('admin.suppliers.cancelButton')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting ? t('admin.suppliers.savingStatus') : (isEdit ? t('admin.suppliers.updateButton') : t('admin.suppliers.createButton'))}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
