'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';

type SaleItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: {
    id: string;
    sku: string;
    name: string;
    imageUrl?: string | null;
    sellPrice: number;
    quantity: number;
  };
};

type SaleDetail = {
  id: string;
  orderId: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: string;
  status: string;
  items: SaleItem[];
};

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  sellPrice: number;
  quantity: number;
};

type SaleDetailsModalProps = {
  saleId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SaleDetailsModal({ saleId, isOpen, onClose }: SaleDetailsModalProps) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === productId),
    [productId, products]
  );

  const loadSale = async () => {
    if (!saleId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/sales/${saleId}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(t('messages.operationFailed'));
      }
      const payload = await response.json();
      setSale(payload.data as SaleDetail);
    } catch (error) {
      toastError(error instanceof Error ? error.message : t('messages.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/admin/products?limit=1000', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      setProducts((payload.data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        sellPrice: item.sellPrice,
        quantity: item.quantity,
      })));
    } catch {
      // keep modal usable even if product lookup fails
    }
  };

  useEffect(() => {
    if (!isOpen || !saleId) return;
    void loadSale();
    void loadProducts();
  }, [isOpen, saleId]);

  const addItem = async () => {
    if (!saleId || !productId) {
      toastError(t('admin.salesPayment.selectProduct'));
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/sales/${saleId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: Number(quantity),
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || t('messages.operationFailed'));
      }

      success(t('admin.salesPayment.itemAdded'));
      setQuantity('1');
      await loadSale();
    } catch (error) {
      toastError(error instanceof Error ? error.message : t('messages.operationFailed'));
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!saleId) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/sales/${saleId}/items?itemId=${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || t('messages.operationFailed'));
      }

      success(t('admin.salesPayment.itemRemoved'));
      await loadSale();
    } catch (error) {
      toastError(error instanceof Error ? error.message : t('messages.operationFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !saleId) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{t('admin.salesPayment.viewDetails')}</h3>
            <p className="text-sm text-slate-500">{sale?.orderId || saleId}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={t('admin.modals.closeModal')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t('admin.salesPayment.subtotal')}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">৳{sale?.subtotal?.toLocaleString('en-BD') || '0'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t('admin.salesPayment.discount')}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">৳{sale?.discount?.toLocaleString('en-BD') || '0'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t('admin.modals.tax')}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">৳{sale?.tax?.toLocaleString('en-BD') || '0'}</p>
              </div>
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="text-xs text-orange-600">{t('admin.modals.total')}</p>
                <p className="mt-1 text-lg font-semibold text-orange-700">৳{sale?.total?.toLocaleString('en-BD') || '0'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h4 className="font-semibold text-slate-900">{t('admin.salesPayment.saleItems')}</h4>
                <span className="text-sm text-slate-500">{sale?.items?.length || 0}</span>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-slate-500">{t('admin.salesPayment.loadingDetails')}</div>
              ) : sale?.items?.length ? (
                <div className="max-h-[42vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t('admin.salesPayment.product')}</th>
                        <th className="px-4 py-3">{t('admin.salesPayment.quantity')}</th>
                        <th className="px-4 py-3">{t('admin.salesPayment.unitPrice')}</th>
                        <th className="px-4 py-3">{t('admin.salesPayment.totalAmount')}</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{item.product.name}</div>
                            <div className="text-xs text-slate-500">{item.product.sku}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{item.quantity}</td>
                          <td className="px-4 py-3 text-slate-700">৳{item.unitPrice.toLocaleString('en-BD')}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">৳{item.total.toLocaleString('en-BD')}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="rounded-md p-2 text-red-600 hover:bg-red-50"
                              aria-label={t('common.delete')}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-sm text-slate-500">{t('admin.salesPayment.noItems')}</div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-900">{t('admin.salesPayment.addItem')}</h4>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.salesPayment.product')}</label>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('admin.salesPayment.selectProduct')}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.salesPayment.quantity')}</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.salesPayment.unitPrice')}</label>
                <input
                  value={`৳${(selectedProduct?.sellPrice ?? 0).toLocaleString('en-BD')}`}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>{t('admin.productService.stock')}: {selectedProduct?.quantity ?? 0}</p>
              <p className="mt-1">{t('admin.modals.total')}: ৳{selectedProduct ? (selectedProduct.sellPrice * Math.max(1, Number(quantity || 1))).toLocaleString('en-BD') : '0'}</p>
            </div>

            <button
              type="button"
              onClick={addItem}
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? t('admin.modals.creating') : t('admin.salesPayment.addItem')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
