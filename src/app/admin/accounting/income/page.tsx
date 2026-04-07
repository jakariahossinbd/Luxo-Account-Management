'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
};

type IncomeRow = {
  id: string;
  accountId: string;
  amount: number;
  description?: string | null;
  referenceNo?: string | null;
  createdAt: string;
  account: {
    id: string;
    name: string;
    type: string;
  };
};

type IncomeResponse = {
  data: IncomeRow[];
  accounts: Account[];
  meta: {
    totalIncome: number;
  };
};

export default function AccountingIncomePage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [form, setForm] = useState({
    accountId: '',
    amount: '0',
    description: '',
    referenceNo: '',
  });

  const fetchIncome = async (fromDate: string = '', toDate: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ limit: '10000' });
      if (fromDate) params.append('startDate', fromDate);
      if (toDate) params.append('endDate', toDate);
      const response = await fetch(`/api/admin/accounting/income?${params}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load income transactions');
      const payload: IncomeResponse = await response.json();
      setRows(payload.data || []);
      setAccounts(payload.accounts || []);
      setTotalIncome(payload.meta?.totalIncome || 0);
      if (!form.accountId && payload.accounts?.length) {
        setForm((prev) => ({ ...prev, accountId: payload.accounts[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchIncome();
  }, []);

  const onDateRangeChange = async (from: string, to: string) => {
    setStartDate(from);
    setEndDate(to);
    await fetchIncome(from, to);
  };

  const onClearFilter = async () => {
    setStartDate('');
    setEndDate('');
    await fetchIncome('', '');
  };

  const onExport = () => {
    if (rows.length === 0) {
      alert('No data to export');
      return;
    }

    let csv = 'Account,Description,Reference,Amount,Date\n';
    rows.forEach((row) => {
      const account = row.account?.name || '-';
      const desc = (row.description || '-').replace(/"/g, '""');
      const ref = (row.referenceNo || '-').replace(/"/g, '""');
      const amount = row.amount;
      const date = new Date(row.createdAt).toLocaleDateString('en-BD');
      csv += `"${account}","${desc}","${ref}",${amount},"${date}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `income-ledger-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const thisMonthIncome = useMemo(() => {
    const now = new Date();
    return rows
      .filter((row) => {
        const d = new Date(row.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, row) => sum + row.amount, 0);
  }, [rows]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Number(form.amount) <= 0) {
      setError(t('admin.accounting.income.amountGreaterThanZero'));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const response = await fetch('/api/admin/accounting/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: form.accountId,
          amount: Number(form.amount),
          description: form.description,
          referenceNo: form.referenceNo,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || t('admin.accounting.income.saveFailed'));
      }

      setShowForm(false);
      setForm((prev) => ({ ...prev, amount: '0', description: '', referenceNo: '' }));
      await fetchIncome(startDate, endDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.accounting.income.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.accounting.income.title')}</h1>
            <p className="mt-2 text-slate-600">{t('admin.accounting.income.description')}</p>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            {t('admin.accounting.income.addIncome')}
          </button>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onDateRangeChange(e.target.value, endDate)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onDateRangeChange(startDate, e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClearFilter}
                disabled={!startDate && !endDate}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('admin.accounting.income.clearFilter')}
              </button>
              <button
                onClick={onExport}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {t('admin.accounting.income.exportCSV')}
              </button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.accounting.income.totalIncome')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(totalIncome)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.accounting.income.thisMonth')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(thisMonthIncome)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.accounting.income.transactionCount')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{rows.length}</p>
          </div>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-600">{t('admin.accounting.income.loadingIncome')}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t('admin.accounting.income.noIncome')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.income.account')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.income.descriptionColumn')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.income.referenceNo')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.income.amount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.income.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">{row.account?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{row.description || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{row.referenceNo || '-'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-700">{formatTaka(row.amount)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{new Date(row.createdAt).toLocaleDateString('en-BD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm ? (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-slate-900">{t('admin.accounting.income.createIncome')}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-700">{t('admin.accounting.income.close')}</button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.income.selectAccount')}</label>
                  <select
                    value={form.accountId}
                    onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.income.amount')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.income.referenceNoLabel')}</label>
                    <input
                      value={form.referenceNo}
                      onChange={(e) => setForm((prev) => ({ ...prev, referenceNo: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder={t('admin.accounting.income.descriptionPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.income.descriptionLabel')}</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder={t('admin.accounting.income.descriptionPlaceholder')}
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    {t('admin.accounting.income.cancelButton')}
                  </button>
                  <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                    {submitting ? t('admin.accounting.income.saving') : t('admin.accounting.income.createButton')}
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
