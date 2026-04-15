'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ThemeSync } from '@/components/layout/ThemeSync';
import { CommunicationSync } from '@/components/layout/CommunicationSync';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeSync />
      <CommunicationSync />
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}