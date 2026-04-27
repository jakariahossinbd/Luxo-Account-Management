'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ReportStats {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  walletInflows: number;
  walletOutflows: number;
  walletBalance: number;
  totalProducts: number;
  totalSellers: number;
  averageOrderValue: number;
}

interface WalletsResponse {
  success?: boolean;
  data?: {
    inflows?: number;
    outflows?: number;
    balance?: number;
  };
}

interface ApiListResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ReportStats>({
    totalSales: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    walletInflows: 0,
    walletOutflows: 0,
    walletBalance: 0,
    totalProducts: 0,
    totalSellers: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('this-month');

  const fetchStats = async () => {
    try {
      setLoading(true);
      // For now, we'll aggregate data from different endpoints
      const [salesRes, purchaseRes, expenseRes, productRes, sellerRes, walletsRes] = await Promise.all([
        fetch('/api/admin/sales?limit=1000', { cache: 'no-store' }),
        fetch('/api/admin/purchase?limit=1000', { cache: 'no-store' }),
        fetch('/api/admin/accounting?limit=1000', { cache: 'no-store' }),
        fetch('/api/admin/products?limit=1000', { cache: 'no-store' }),
        fetch('/api/admin/seller-manage?limit=1000', { cache: 'no-store' }),
        fetch('/api/admin/wallets', { cache: 'no-store' }),
      ]);

      const salesData: ApiListResponse<{ total: number }> = await salesRes.json();
      const purchaseData: ApiListResponse<{ total: number }> = await purchaseRes.json();
      const expenseData: ApiListResponse<{ amount: number }> = await expenseRes.json();
      const productData: ApiListResponse<unknown> = await productRes.json();
      const sellerData: ApiListResponse<unknown> = await sellerRes.json();
      const walletData: WalletsResponse = await walletsRes.json();

      const totalSalesAmount = salesData.data.reduce((sum: number, s) => sum + s.total, 0);
      const totalPurchasesAmount = purchaseData.data.reduce((sum: number, p) => sum + p.total, 0);
      const totalExpensesAmount = expenseData.data.reduce((sum: number, e) => sum + e.amount, 0);
      const totalProductsCount = productData.pagination.total;
      const totalSellersCount = sellerData.pagination.total;
      const avgOrderValue = salesData.pagination.total > 0 ? totalSalesAmount / salesData.pagination.total : 0;

      setStats({
        totalSales: totalSalesAmount,
        totalPurchases: totalPurchasesAmount,
        totalExpenses: totalExpensesAmount,
        walletInflows: Number(walletData.data?.inflows) || 0,
        walletOutflows: Number(walletData.data?.outflows) || 0,
        walletBalance: Number(walletData.data?.balance) || 0,
        totalProducts: totalProductsCount,
        totalSellers: totalSellersCount,
        averageOrderValue: avgOrderValue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;
  const netProfit = stats.totalSales - stats.totalPurchases - stats.totalExpenses;
  const profitMargin = stats.totalSales > 0 ? (netProfit / stats.totalSales * 100).toFixed(2) : '0';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.reports.managementTitle')}</h1>
            <p className="mt-2 text-slate-600">{t('admin.reports.managementSubtitle')}</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900"
          >
            <option value="this-month">{t('admin.reports.thisMonth')}</option>
            <option value="last-month">{t('admin.reports.lastMonth')}</option>
            <option value="this-year">{t('admin.reports.thisYear')}</option>
            <option value="custom">{t('admin.reports.custom')}</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
            {t('admin.reports.loadingReportData')}
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{t('admin.reports.totalSales')}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(stats.totalSales)}</p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{t('admin.reports.totalPurchases')}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(stats.totalPurchases)}</p>
                  </div>
                  <div className="rounded-full bg-purple-100 p-3">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{t('admin.reports.totalExpenses')}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(stats.totalExpenses)}</p>
                  </div>
                  <div className="rounded-full bg-red-100 p-3">
                    <BarChart3 className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Wallet Inflows (Seller Delivery)</p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">{formatTaka(stats.walletInflows)}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Wallet Outflows (Admin Expenses)</p>
                <p className="mt-2 text-3xl font-bold text-red-600">{formatTaka(stats.walletOutflows)}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Wallet Balance</p>
                <p className={`mt-2 text-3xl font-bold ${stats.walletBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatTaka(stats.walletBalance)}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">{t('admin.reports.netProfit')}</p>
                <p className={`mt-2 text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatTaka(netProfit)}
                </p>
                <p className="mt-2 text-xs text-slate-500">{t('admin.reports.margin')}: {profitMargin}%</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">{t('admin.reports.avgOrderValue')}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(stats.averageOrderValue)}</p>
                <p className="mt-2 text-xs text-slate-500">{t('admin.reports.perTransaction')}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">{t('admin.reports.businessHealth')}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{t('admin.productService.products')}:</span>
                    <span className="font-semibold text-slate-900">{stats.totalProducts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{t('admin.sellerManage.sellers')}:</span>
                    <span className="font-semibold text-slate-900">{stats.totalSellers}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{t('admin.reports.revenueBreakdown')}</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">{t('admin.salesPayment.sales')}</span>
                      <span className="text-sm font-semibold text-slate-900">{stats.totalSales > 0 ? Math.round((stats.totalSales / (stats.totalSales + stats.totalPurchases)) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${stats.totalSales > 0 ? (stats.totalSales / (stats.totalSales + stats.totalPurchases)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">{t('admin.purchase.title')}</span>
                      <span className="text-sm font-semibold text-slate-900">{stats.totalPurchases > 0 ? Math.round((stats.totalPurchases / (stats.totalSales + stats.totalPurchases)) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all"
                        style={{ width: `${stats.totalPurchases > 0 ? (stats.totalPurchases / (stats.totalSales + stats.totalPurchases)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{t('admin.reports.expenseBreakdown')}</h3>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">{t('admin.reports.totalExpenses')}</span>
                    <span className="text-sm font-semibold text-slate-900">{formatTaka(stats.totalExpenses)}</span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    {stats.totalSales > 0
                      ? `${t('admin.reports.expensesAre')} ${(stats.totalExpenses / stats.totalSales * 100).toFixed(2)}% ${t('admin.reports.ofRevenue')}`
                      : t('admin.reports.noSalesData')}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
