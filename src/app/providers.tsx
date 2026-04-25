'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ThemeSync } from '@/components/layout/ThemeSync';
import { CommunicationSync } from '@/components/layout/CommunicationSync';
import { LanguageSync } from '@/components/layout/LanguageSync';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <ThemeSync />
      <LanguageSync />
      <CommunicationSync />
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}