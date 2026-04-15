'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

type WalletsApiResponse = {
  success?: boolean;
  data?: {
    balance?: number;
    inflows?: number;
    outflows?: number;
  };
};

export function WalletsSection() {
  const { t, language } = useTranslation();
  const isBangla = language === 'bn';
  const [wallets, setWallets] = useState({
    balance: 0,
    inflows: 0,
    outflows: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadWallets() {
      try {
        const response = await fetch('/api/admin/wallets', { cache: 'no-store' });
        if (!response.ok) return;

        const payload = (await response.json()) as WalletsApiResponse;
        if (!payload.success || !payload.data || cancelled) return;

        setWallets({
          balance: Number(payload.data.balance) || 0,
          inflows: Number(payload.data.inflows) || 0,
          outflows: Number(payload.data.outflows) || 0,
        });
      } catch {
        // Keep defaults when API is unavailable.
      }
    }

    loadWallets();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = (value: number) => {
    const symbol = '৳';
    return `${symbol}${value.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="mb-5 px-2 md:px-0">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-dashed border-slate-300 pb-2">
          <span className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.08em] leading-none">
            {t('admin.wallets.title') || 'MY WALLETS'}
          </span>

          <h2 className="text-[18px] font-extrabold text-orange-600 leading-none tracking-[0.05em] text-center">
            {t('common.dashboard') || 'DASHBOARD'}
          </h2>

          <button className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-slate-800 leading-none">
            <span>{t('common.today') || 'Today'}</span>
            <span className="text-[11px]">▼</span>
          </button>
        </div>

        <div className="mt-2 text-center">
          <p className="text-[19px] font-medium text-slate-800 leading-none">
            <span className="text-slate-800">{t('admin.wallets.balance') || 'Balance'} : </span>
            <span className="text-[21px] font-semibold text-blue-600">{formatCurrency(wallets.balance)}</span>
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-0 text-center shadow-sm overflow-hidden">
            <p className={`${isBangla ? 'text-[16px]' : 'text-[18px]'} font-semibold text-slate-800 leading-none py-3 border-b border-slate-200`}>
              {t('admin.wallets.inflows') || 'Inflows'}
            </p>
            <div className="py-3">
              <p className="text-[18px] font-semibold text-emerald-600 leading-none mb-2">{formatCurrency(wallets.inflows)}</p>
              <p className="text-[13px] font-medium text-sky-600 leading-none">Seller delivery only</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-0 text-center shadow-sm overflow-hidden">
            <p className={`${isBangla ? 'text-[16px]' : 'text-[18px]'} font-semibold text-slate-800 leading-none py-3 border-b border-slate-200`}>
              {t('admin.wallets.outflows') || 'Outflows'}
            </p>
            <div className="py-3">
              <p className="text-[18px] font-semibold text-red-600 leading-none mb-2">{formatCurrency(wallets.outflows)}</p>
              <p className="text-[13px] font-medium text-fuchsia-500 leading-none">Admin expense records only</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
