'use client';

import { useMemo } from 'react';
import { useToastContext } from '@/components/ui/ToastProvider';

export function useToast() {
  const { showToast } = useToastContext();

  return useMemo(
    () => ({
      toast: showToast,
      success: (message: string, title?: string) => showToast(message, { title, variant: 'success' }),
      error: (message: string, title?: string) => showToast(message, { title, variant: 'error' }),
      info: (message: string, title?: string) => showToast(message, { title, variant: 'info' }),
      warning: (message: string, title?: string) => showToast(message, { title, variant: 'warning' }),
    }),
    [showToast]
  );
}
