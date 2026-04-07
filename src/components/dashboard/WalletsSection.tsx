'use client';

import { useTranslation } from '@/hooks/useTranslation';

export function WalletsSection() {
  const { t } = useTranslation();

  // Mock data - will be replaced with API data
  const balance = 0.0;
  const inflows = 0.0;
  const outflows = 0.0;

  const formatCurrency = (value: number) => {
    const symbol = 'ƀ'; // Taka symbol
    return `${symbol}${value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4 mb-20 md:mb-0">
      {/* Header */}
      <div className="px-4 md:px-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
            {t('admin.wallets.title') || 'My Wallets'}
          </h2>
          <span className="text-xs text-slate-500">{t('common.today') || 'Today'}</span>
        </div>

        {/* Main Balance Card */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600 mb-2">
            {t('admin.wallets.balance') || 'Balance'}
          </p>
          <p className="text-4xl md:text-5xl font-bold text-slate-900">
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Inflows & Outflows Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 px-4 md:px-0">
        {/* Inflows */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:p-6 shadow-sm">
          <p className="text-xs md:text-sm font-medium text-slate-600 mb-2">
            {t('admin.wallets.inflows') || 'Inflows'}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-emerald-600 mb-1">
            {formatCurrency(inflows)}
          </p>
          <p className="text-xs md:text-sm font-semibold text-emerald-600 flex items-center gap-1">
            <span className="text-emerald-500">↑</span>
            {t('admin.wallets.increase') || '100% Increase'}
          </p>
        </div>

        {/* Outflows */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 md:p-6 shadow-sm">
          <p className="text-xs md:text-sm font-medium text-slate-600 mb-2">
            {t('admin.wallets.outflows') || 'Outflows'}
          </p>
          <p className="text-2xl md:text-3xl font-bold text-red-600 mb-1">
            {formatCurrency(outflows)}
          </p>
          <p className="text-xs md:text-sm font-semibold text-red-600 flex items-center gap-1">
            <span className="text-red-500">↑</span>
            {t('admin.wallets.increase') || '100% Increase'}
          </p>
        </div>
      </div>
    </div>
  );
}
