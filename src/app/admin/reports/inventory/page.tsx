'use client';

import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AdminLayout } from '@/components/layout/AdminLayout';

type Product = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  minStockAlert: number;
  sellPrice: number;
  category?: {
    name: string;
  };
};

export default function ReportsInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/products?limit=1000', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (active) setProducts(payload.data || []);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const lowStock = useMemo(
    () => products.filter((p) => p.quantity <= p.minStockAlert),
    [products]
  );

  const stockValue = useMemo(
    () => products.reduce((sum, p) => sum + p.quantity * p.sellPrice, 0),
    [products]
  );

  const stockStatusData = useMemo(
    () => [
      { name: 'In Stock', value: products.filter((p) => p.quantity > p.minStockAlert).length },
      { name: 'Low Stock', value: lowStock.length },
    ],
    [products, lowStock]
  );

  const topProductsByValue = useMemo(
    () =>
      products
        .map((p) => ({
          name: p.name.substring(0, 15),
          value: p.quantity * p.sellPrice,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [products]
  );

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Reports</h1>
          <p className="mt-2 text-slate-600">Stock position, low-stock alerts, and inventory value.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Total Products</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{products.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Low Stock Items</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">{lowStock.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Inventory Value</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(stockValue)}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Stock Status</h3>
            {products.length === 0 ? (
              <div className="p-8 text-center text-slate-600">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Top Products by Value</h3>
            {topProductsByValue.length === 0 ? (
              <div className="p-8 text-center text-slate-600">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProductsByValue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatTaka(value as number)} />
                  <Bar dataKey="value" fill="#3b82f6" name="Stock Value" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading inventory report...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No products available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Min Alert</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.sku}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{product.category?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{product.quantity}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{product.minStockAlert}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatTaka(product.quantity * product.sellPrice)}</td>
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
