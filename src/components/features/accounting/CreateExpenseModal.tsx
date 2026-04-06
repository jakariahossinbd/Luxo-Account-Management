'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';

type Category = {
  id: string;
  name: string;
};

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateExpenseModal({ isOpen, onClose, onCreated }: CreateExpenseModalProps) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadCategories() {
      try {
        const response = await fetch('/api/categories', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (mounted && payload?.data) {
          setCategories(payload.data as Category[]);
        }
      } catch {
        // Category loading failure should not break modal rendering.
      }
    }

    loadCategories();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const resetForm = () => {
    setDescription('');
    setAmount('0');
    setCategoryId('');
    setPaymentMethod('CASH');
    setPaymentStatus('PAID');
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!description.trim()) {
      toastError(t('admin.modals.descriptionRequired'));
      return;
    }

    if (!categoryId) {
      toastError(t('admin.modals.categoryRequired'));
      return;
    }

    if (Number(amount) <= 0) {
      toastError(t('admin.modals.amountRequired'));
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/admin/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount,
          categoryId,
          paymentMethod,
          paymentStatus,
          date,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || t('admin.modals.createExpenseFailed'));
      }

      success(t('admin.modals.createExpenseSuccess'));
      resetForm();
      onClose();
      onCreated();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('admin.modals.createExpenseFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{t('admin.modals.createExpenseTitle')}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label={t('admin.modals.closeModal')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.description')}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('admin.modals.expenseDescriptionPlaceholder')}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.productService.category')}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('admin.modals.selectCategory')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.amount')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.paymentMethod')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CASH">{t('admin.modals.paymentMethod.cash')}</option>
                <option value="BANK">{t('admin.modals.paymentMethod.bank')}</option>
                <option value="CARD">{t('admin.modals.paymentMethod.card')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.paymentStatus')}</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PAID">{t('admin.modals.paymentStatus.paid')}</option>
                <option value="PENDING">{t('admin.modals.paymentStatus.pending')}</option>
                <option value="PARTIAL">{t('admin.modals.paymentStatus.partial')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('admin.accounting.date')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {isSubmitting ? t('admin.modals.creating') : t('admin.modals.createExpenseAction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
