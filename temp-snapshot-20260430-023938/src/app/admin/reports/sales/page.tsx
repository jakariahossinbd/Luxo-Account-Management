'use client';

import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AdminLayout } from '@/components/layout/AdminLayout';

type Sale = {
  id: string;
  orderId: string;
  invoiceNumber?: string | null;
  total: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
};

export default function ReportsSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/sales?limit=1000', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) setSales(payload.data || []);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const paidTotal = useMemo(
    () => sales.filter((s) => s.paymentStatus === 'PAID').reduce((sum, s) => sum + s.total, 0),
    [sales]
  );

  const pendingTotal = useMemo(
    () => sales.filter((s) => s.paymentStatus !== 'PAID').reduce((sum, s) => sum + s.total, 0),
    [sales]
  );

  const chartData = useMemo(
    () => [
      { name: 'Paid', value: paidTotal },
      { name: 'Pending', value: pendingTotal },
    ],
    [paidTotal, pendingTotal]
  );

  const monthlyData = useMemo(() => {
    const monthly: Record<string, { paid: number; pending: number }> = {};
    sales.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const key = date.toLocaleString('en-BD', { year: 'numeric', month: 'short' });
      if (!monthly[key]) {
        monthly[key] = { paid: 0, pending: 0 };
      }
      if (sale.paymentStatus === 'PAID') {
        monthly[key].paid += sale.total;
      } else {
        monthly[key].pending += sale.total;
      }
    });
    return Object.entries(monthly).map(([month, data]) => ({
      month,
      paid: data.paid,
      pending: data.pending,
    }));
  }, [sales]);

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales Reports</h1>
          <p className="mt-2 text-slate-600">Paid vs pending sales and order-level summary.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Total Orders</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{sales.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Paid Sales</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{formatTaka(paidTotal)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Pending Sales</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">{formatTaka(pendingTotal)}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Payment Status Distribution</h3>
            {sales.length === 0 ? (
              <div className="p-8 text-center text-slate-600">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatTaka(value)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip formatter={(value) => formatTaka(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Monthly Sales Trend</h3>
            {monthlyData.length === 0 ? (
              <div className="p-8 text-center text-slate-600">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatTaka(value as number)} />
                  <Legend />
                  <Bar dataKey="paid" fill="#10b981" name="Paid" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading sales report...</div>
          ) : sales.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No sales data available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{sale.orderId}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{sale.invoiceNumber || '-'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatTaka(sale.total)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{sale.paymentStatus}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{sale.status}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{new Date(sale.createdAt).toLocaleDateString('en-BD')}</td>
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
