'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';

type SupplierOption = {
  id: string;
  name: string;
  phone: string;
};

interface CreatePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePurchaseModal({ isOpen, onClose, onCreated }: CreatePurchaseModalProps) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [supplierId, setSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [subtotal, setSubtotal] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [status, setStatus] = useState('PENDING');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(() => {
    const subtotalNum = Number(subtotal || 0);
    const discountNum = Number(discount || 0);
    const taxNum = Number(tax || 0);
    return Math.max(0, subtotalNum - discountNum + taxNum);
  }, [subtotal, discount, tax]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function loadSuppliers() {
      try {
        const response = await fetch('/api/admin/suppliers?limit=200', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        const rows = (payload.data || []) as SupplierOption[];
        const activeRows = rows.filter((item) => item.id && item.name);
        if (!active) return;
        setSuppliers(activeRows);
        if (!supplierId && activeRows.length > 0) {
          setSupplierId(activeRows[0].id);
        }
      } catch {
        // Keep modal usable even if supplier lookup fails.
      }
    }

    void loadSuppliers();

    return () => {
      active = false;
    };
  }, [isOpen, supplierId]);

  const resetForm = () => {
    setSupplierId('');
    setSubtotal('0');
    setDiscount('0');
    setTax('0');
    setStatus('PENDING');
    setNotes('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supplierId.trim()) {
      toastError(t('admin.modals.supplierIdRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          subtotal,
          discount,
          tax,
          total,
          status,
          notes,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || t('admin.modals.createPurchaseFailed'));
      }

      success(t('admin.modals.createPurchaseSuccess'));
      resetForm();
      onClose();
      onCreated();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('admin.modals.createPurchaseFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{t('admin.modals.createPurchaseTitle')}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label={t('admin.modals.closeModal')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.modals.supplierId')}</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} ({supplier.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.purchase.subtotal')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.purchase.discount')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.modals.tax')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.salesPayment.status')}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">{t('admin.modals.status.pending')}</option>
                <option value="PROCESSING">{t('admin.modals.status.processing')}</option>
                <option value="COMPLETED">{t('admin.modals.status.completed')}</option>
                <option value="CANCELLED">{t('admin.modals.status.cancelled')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.modals.total')}</label>
              <input
                value={total.toFixed(2)}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.modals.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('admin.modals.optionalNotes')}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? t('admin.modals.creating') : t('admin.modals.createPurchaseAction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
