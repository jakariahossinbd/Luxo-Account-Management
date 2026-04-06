'use client';

import { useToastContext } from '@/components/ui/ToastProvider';

export function useToast() {
  const { showToast } = useToastContext();

  return {
    toast: showToast,
    success: (message: string, title?: string) => showToast(message, { title, variant: 'success' }),
    error: (message: string, title?: string) => showToast(message, { title, variant: 'error' }),
    info: (message: string, title?: string) => showToast(message, { title, variant: 'info' }),
    warning: (message: string, title?: string) => showToast(message, { title, variant: 'warning' }),
  };
}
