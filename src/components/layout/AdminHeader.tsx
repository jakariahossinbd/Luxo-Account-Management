'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Menu } from 'lucide-react';
import { HeaderNotifications } from './HeaderNotifications';

interface AdminHeaderProps {
  onMenuClick?: () => void;
  avatarImage?: string;
  avatarName?: string;
  avatarRole?: string;
  avatarRoleSub?: string;
}

export function AdminHeader({
  onMenuClick,
  avatarImage,
  avatarName = 'Admin',
  avatarRole = 'Admin',
  avatarRoleSub = 'Administrator',
}: AdminHeaderProps) {
  const router = useRouter();
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const normalizedRole = avatarRole.toLowerCase() === 'admin' ? 'admin' : 'seller';

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!avatarMenuRef.current?.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const handleProfileRoute = () => {
    setIsAvatarMenuOpen(false);
    router.push(normalizedRole === 'admin' ? '/admin/profile' : '/seller/profile');
  };

  const handleLogout = async () => {
    setIsAvatarMenuOpen(false);
    await signOut({ redirect: false });
    router.replace(normalizedRole === 'admin' ? '/login/admin?next=%2Fadmin' : '/login/seller?next=%2Fseller');
  };

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/luxo-logo.svg" alt="Luxo" className="h-12 w-auto object-contain" />
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6">
          <LanguageSwitcher />
          <HeaderNotifications role={normalizedRole} />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{avatarRole}</p>
              <p className="text-xs text-slate-500">{avatarRoleSub}</p>
            </div>
            <div ref={avatarMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                className="rounded-full focus:outline-none"
                aria-label="Open profile menu"
              >
                {avatarImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarImage} alt={avatarName} className="h-10 w-10 rounded-full object-cover ring-2 ring-orange-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-orange-500 ring-2 ring-orange-200">
                    <div className="grid h-full w-full place-items-center font-bold text-sm text-white">{avatarName.charAt(0).toUpperCase()}</div>
                  </div>
                )}
              </button>

              {isAvatarMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-36 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={handleProfileRoute}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
