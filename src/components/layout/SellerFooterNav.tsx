'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { PackageCheck, Home, Users, UserRound, ShoppingCart } from 'lucide-react';

type SellerView = 'home' | 'create-sales' | 'customer-leds' | 'product-stock' | 'attendance' | 'monthly-report' | 'personal-note' | 'profile';

interface SellerFooterNavProps {
  activeView: SellerView;
  onNavigate: (view: SellerView) => void;
}

export function SellerFooterNav({ activeView, onNavigate }: SellerFooterNavProps) {
  const { t } = useTranslation();

  const navItems = [
    { key: 'create-sales' as const, icon: ShoppingCart, label: t('seller.createSales') },
    { key: 'customer-leds' as const, icon: Users, label: t('seller.customerLeds') },
    { key: 'home' as const, icon: Home, label: 'HOME', isCenter: true },
    { key: 'product-stock' as const, icon: PackageCheck, label: t('seller.productStock') },
    { key: 'profile' as const, icon: UserRound, label: t('seller.sellerProfile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-3 py-1 shadow-sm md:block lg:left-64">
      <ul className="relative mx-auto grid h-14 w-full max-w-[1400px] grid-cols-5 items-center gap-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.key;

          if (item.isCenter) {
            return (
              <li key={item.key} className="relative -top-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className="seller-menu-hover relative flex h-16 w-16 flex-col items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_8px_18px_rgba(249,115,22,0.42),inset_0_2px_0_rgba(255,255,255,0.28)] transition hover:shadow-[0_10px_20px_rgba(249,115,22,0.5),inset_0_2px_0_rgba(255,255,255,0.3)] active:scale-95"
                >
                  <Icon className="h-5 w-5 scale-110" />
                  <span className="mt-1 text-[9px] font-bold whitespace-nowrap text-white">{item.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.key} className="flex h-full items-center justify-center">
              <button
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`seller-menu-hover relative flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 py-0 transition ${
                  isActive ? 'text-orange-500' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {isActive && <span className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-orange-500" />}
                <Icon className="h-5 w-5 scale-125" />
                <span className="max-w-[70px] truncate whitespace-nowrap text-center text-[9px] font-semibold leading-tight">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}