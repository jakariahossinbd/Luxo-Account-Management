'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { CreateProductModal } from '@/components/features/products/CreateProductModal';
import { useTranslation } from '@/hooks/useTranslation';

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  minStockAlert: number;
  imageUrl?: string;
  createdAt: string;
}

interface PaginationData {
  data: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const { success, error: toastError, info } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProducts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/products?page=${page}&limit=10`);
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      const data: PaginationData = await response.json();
      setProducts(data.data);
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
    void fetchProducts();
  }, [fetchProducts]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      fetchProducts(newPage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.productService.deleteConfirm'))) {
      info(t('admin.productService.deleteCancelled'));
      return;
    }
    try {
      const response = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(t('messages.operationFailed'));
      success(t('admin.productService.deleteSuccess'));
      fetchProducts(pagination.page);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('messages.operationFailed'));
    }
  };

  const formatTaka = (amount: number) => `৳${amount.toLocaleString('en-BD')}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.productService.managementTitle')}</h1>
            <p className="mt-2 text-slate-600">{t('admin.productService.managementSubtitle')}</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            {t('admin.productService.create')}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.productService.totalProducts')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pagination.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.productService.totalStockValue')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatTaka(products.reduce((sum, p) => sum + (p.sellPrice * p.quantity), 0))}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.productService.lowStockItems')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{products.filter(p => p.quantity <= p.minStockAlert).length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-600">{t('admin.productService.totalProfitMargin')}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{products.length > 0 ? Math.round(products.reduce((sum, p) => sum + ((p.sellPrice - p.costPrice) / p.sellPrice * 100), 0) / products.length) : 0}%</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t('admin.productService.inventoryTitle')}</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-600">{t('messages.loadingData')}</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-slate-600">{t('admin.productService.noProductsData')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.productService.sku')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.productService.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.productService.costPrice')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.productService.sellPrice')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.productService.stock')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.productService.minAlert')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.productService.stockValue')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-600">{t('admin.accounting.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.sku}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatTaka(product.costPrice)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatTaka(product.sellPrice)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          product.quantity <= product.minStockAlert ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {product.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{product.minStockAlert}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatTaka(product.sellPrice * product.quantity)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-700" title={t('common.edit')}>
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-700" title={t('common.delete')}>
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
              {t('admin.accounting.showing')} {products.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} {t('admin.accounting.to')} {Math.min(pagination.page * pagination.limit, pagination.total)} {t('admin.accounting.of')} {pagination.total}
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

        <CreateProductModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={() => fetchProducts(1)}
        />
      </div>
    </AdminLayout>
  );
}
