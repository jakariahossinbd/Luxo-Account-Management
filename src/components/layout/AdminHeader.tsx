'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Menu, Bell } from 'lucide-react';
import { useState } from 'react';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white px-4">
      <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between py-3 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="grid h-10 w-10 place-items-center text-slate-900 transition hover:bg-slate-100 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Luxo" className="h-12 w-auto object-contain" />
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6">
          <LanguageSwitcher />
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"
          >
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">Admin</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-orange-500 ring-2 ring-orange-200">
              <div className="h-full w-full grid place-items-center text-white font-bold text-sm">A</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
