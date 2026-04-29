'use client';

import { useTranslation } from '@/hooks/useTranslation';

export function InvoiceSection() {
  const { t } = useTranslation();

  const totalInvoices = 0;
  const totalAmount = 0.0;
  const totalCollection = 0.0;

  const formatCurrency = (value: number) => {
    const symbol = '৳';
    return `${symbol}${value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="mb-6 px-2 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-2">
          <h3 className="text-[18px] font-semibold text-slate-900 uppercase leading-none tracking-wide">
            {t('admin.invoice.title') || 'INVOICE'}
          </h3>
          <button className="flex items-center gap-1 text-[13px] font-semibold text-slate-800 leading-none">
            <span>{t('common.today') || 'Today'}</span>
            <span className="text-sm">▼</span>
          </button>
        </div>

        <div className="mt-3">
          <p className="text-[22px] font-semibold text-slate-900 leading-none">
            {formatCurrency(totalAmount)}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            {t('admin.invoice.totalInvoices') || 'Total 0 Invoices'}
          </p>
        </div>

        <div className="mt-3 h-6 rounded-2xl bg-blue-400 shadow-sm"></div>

        <div className="mt-5">
          <p className="text-[22px] font-semibold text-emerald-600 leading-none">
            {formatCurrency(totalCollection)}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            {t('admin.invoice.totalCollectionLabel') || 'Total Collection From 0 Invoices'}
          </p>
        </div>

        <div className="mt-3 h-6 rounded-2xl bg-emerald-200 shadow-sm"></div>

        <div className="mt-4 flex justify-end">
          <button className="flex items-center gap-2 text-[14px] font-semibold text-blue-600">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-600 text-xs leading-none">+</span>
            <span>{t('admin.invoice.createButton') || 'Create an Invoice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
