'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AdminLayout } from '@/components/layout/AdminLayout';

type SaleRow = { total: number; paymentStatus: string };
type PurchaseRow = { total: number; paymentStatus: string };
type ExpenseRow = { amount: number };
type IncomeRow = { amount: number };

export default function ReportsFinancialPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const [salesRes, purchaseRes, expenseRes, incomeRes] = await Promise.all([
          fetch('/api/admin/sales?limit=1000', { cache: 'no-store' }),
          fetch('/api/admin/purchase?limit=1000', { cache: 'no-store' }),
          fetch('/api/admin/accounting?limit=1000', { cache: 'no-store' }),
          fetch('/api/admin/accounting/income?limit=1000', { cache: 'no-store' }),
        ]);

        const salesJson = salesRes.ok ? await salesRes.json() : { data: [] };
        const purchaseJson = purchaseRes.ok ? await purchaseRes.json() : { data: [] };
        const expenseJson = expenseRes.ok ? await expenseRes.json() : { data: [] };
        const incomeJson = incomeRes.ok ? await incomeRes.json() : { data: [] };

        if (!active) return;

        setSales(salesJson.data || []);
        setPurchases(purchaseJson.data || []);
        setExpenses(expenseJson.data || []);
        setIncomes(incomeJson.data || []);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const paidSales = sales.filter((s) => s.paymentStatus === 'PAID').reduce((sum, s) => sum + s.total, 0);
    const paidPurchases = purchases.filter((p) => p.paymentStatus === 'PAID').reduce((sum, p) => sum + p.total, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

    const netProfit = paidSales - paidPurchases - totalExpenses;
    const cashPosition = totalIncome + paidSales - paidPurchases - totalExpenses;

    return {
      paidSales,
      paidPurchases,
      totalExpenses,
      totalIncome,
      netProfit,
      cashPosition,
    };
  }, [sales, purchases, expenses, incomes]);

  const revenueExpenseData = useMemo(
    () => [
      { category: 'Revenue', value: totals.paidSales },
      { category: 'Cost', value: totals.paidPurchases },
      { category: 'Expenses', value: totals.totalExpenses },
      { category: 'Income', value: totals.totalIncome },
    ],
    [totals]
  );

  const profitData = useMemo(
    () => [
      { name: 'Paid Sales', value: totals.paidSales, fill: '#10b981' },
      { name: 'Paid Purchases', value: totals.paidPurchases, fill: '#ef4444' },
      { name: 'Expenses', value: totals.totalExpenses, fill: '#f59e0b' },
      { name: 'Income', value: totals.totalIncome, fill: '#3b82f6' },
    ],
    [totals]
  );

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="mt-2 text-slate-600">Overall financial performance from sales, purchases, expenses, and income.</p>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">Loading financial report...</div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Paid Sales</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(totals.paidSales)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Paid Purchases</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(totals.paidPurchases)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Total Expenses</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(totals.totalExpenses)}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Income Ledger</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">{formatTaka(totals.totalIncome)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Net Profit</p>
                <p className={`mt-2 text-3xl font-bold ${totals.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatTaka(totals.netProfit)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Cash Position</p>
                <p className={`mt-2 text-3xl font-bold ${totals.cashPosition >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatTaka(totals.cashPosition)}
                </p>
              </div>
            </div>
          </>
        )}

        {!loading && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Financial Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatTaka(value as number)} />
                  <Bar dataKey="value" fill="#3b82f6" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Income vs Expenses</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Income', value: totals.totalIncome },
                      { name: 'Expenses', value: totals.paidPurchases + totals.totalExpenses },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatTaka(value)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip formatter={(value) => formatTaka(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
