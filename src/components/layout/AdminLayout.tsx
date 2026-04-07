'use client';

import { useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { MobileBottomNav } from './MobileBottomNav';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64">
          <div className="mx-auto mt-16 w-full max-w-[1920px] px-4 py-6 lg:px-6 lg:mt-16 pb-24 md:pb-6">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
