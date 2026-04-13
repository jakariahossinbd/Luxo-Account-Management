'use client';

import { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { GlassMorphismSidebar } from './GlassMorphismSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { DesktopFooterNav } from './DesktopFooterNav';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <GlassMorphismSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 bg-gradient-to-br from-slate-50 via-white to-slate-50 lg:ml-64">
          <div className="mx-auto mt-[72px] w-full max-w-[1920px] px-4 py-6 pb-24 md:pb-20 lg:mt-[72px] lg:px-6">
            {children}
          </div>
        </main>
      </div>
      <DesktopFooterNav />
      <MobileBottomNav />
    </div>
  );
}
