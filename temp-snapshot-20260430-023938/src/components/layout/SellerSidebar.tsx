'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeStore } from '@/store/theme';
import { ChevronDown, ShoppingCart, Users, Package, BarChart3, FileText, Settings, MoonStar, User } from 'lucide-react';

type SellerView = 'home' | 'create-sales' | 'customer-leds' | 'product-stock' | 'attendance' | 'monthly-report' | 'personal-note' | 'profile';

interface SellerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeView: SellerView;
  onNavigate: (view: SellerView) => void;
}

export function SellerSidebar({ isOpen = true, onClose, activeView, onNavigate }: SellerSidebarProps) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  const panelToneClass = isDark
    ? 'border-white/10 bg-slate-900/64 shadow-[0_14px_34px_rgba(2,6,23,0.45)]'
    : 'border-white/53 bg-white/77 shadow-[0_10px_30px_rgba(2,6,23,0.10)]';

  const itemDefaultClass = isDark
    ? 'text-slate-200 hover:bg-white/10'
    : 'text-slate-700 hover:bg-white/65';

  const itemActiveClass = isDark
    ? 'bg-orange-400/18 text-orange-100'
    : 'bg-orange-500/15 text-orange-600';

  const items = [
    { key: 'create-sales' as const, label: t('seller.createSales'), icon: ShoppingCart },
    { key: 'customer-leds' as const, label: t('seller.customerLeds'), icon: Users },
    { key: 'product-stock' as const, label: t('seller.productStock'), icon: Package },
    { key: 'attendance' as const, label: t('seller.attendance'), icon: BarChart3 },
    { key: 'monthly-report' as const, label: t('seller.monthlyReport'), icon: FileText },
  ];

  return (
    <>
      {isOpen && <div className={`fixed inset-0 z-20 backdrop-blur-sm lg:hidden ${isDark ? 'bg-black/55' : 'bg-slate-900/35'}`} onClick={onClose} />}

      <aside
        className={`fixed left-0 top-[73px] z-30 h-[calc(100vh-73px)] w-64 overflow-y-auto border-r backdrop-blur-xl transition-transform duration-300 ${panelToneClass} ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:block`}
      >
        <nav className="space-y-1 p-4 pb-24 lg:p-5 lg:pb-6">
          <button
            type="button"
            onClick={() => {
              onNavigate('home');
              onClose?.();
            }}
            className={`seller-menu-hover group flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-all duration-300 ${activeView === 'home' ? itemActiveClass : itemDefaultClass}`}
          >
            <User className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
            <span className="flex-1 font-normal">{t('seller.navigation.dashboard')}</span>
          </button>

          <div className="space-y-1 pt-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onNavigate(item.key);
                    onClose?.();
                  }}
                  className={`seller-menu-hover group flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-all duration-300 ${activeView === item.key ? itemActiveClass : itemDefaultClass}`}
                >
                  <Icon className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  <span className="text-sm font-normal">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className={`seller-menu-hover group flex w-full items-center justify-between rounded-xl border border-transparent px-4 py-3 text-left transition-all duration-300 ${itemDefaultClass}`}
            >
              <span className={`flex items-center gap-3 font-normal ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
                <Settings className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-12" />
                {t('seller.setting')}
              </span>
              <ChevronDown className={`h-4 w-4 transition ${settingsOpen ? 'rotate-180' : ''}`} />
            </button>

            {settingsOpen && (
              <div className="mt-2 space-y-1 border-l border-orange-200 pl-3">
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    onClose?.();
                  }}
                  className={`seller-menu-hover group flex w-full items-center gap-3 rounded-lg border border-transparent px-4 py-2.5 text-left transition-all duration-300 ${itemDefaultClass}`}
                >
                  <MoonStar className="h-4 w-4 text-orange-500 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  <span className="text-sm font-normal">{t('seller.darkMode')}</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}