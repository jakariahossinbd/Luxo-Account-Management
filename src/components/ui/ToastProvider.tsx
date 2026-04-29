'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  title?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, options?: { title?: string; variant?: ToastVariant; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastVariant, { wrapper: string; icon: JSX.Element }> = {
  success: {
    wrapper: 'border-green-200 bg-green-50 text-green-900',
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  },
  error: {
    wrapper: 'border-red-200 bg-red-50 text-red-900',
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
  },
  info: {
    wrapper: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: <Info className="h-5 w-5 text-blue-600" />,
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: { title?: string; variant?: ToastVariant; duration?: number }) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const variant = options?.variant ?? 'info';
      const duration = options?.duration ?? 3500;

      setToasts((prev) => [...prev, { id, message, title: options?.title, variant }]);
      window.setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const style = toastStyles[toast.variant];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border p-4 shadow-lg transition ${style.wrapper}`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">{style.icon}</div>
                <div className="flex-1">
                  {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
                  <p className="text-sm">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="rounded p-1 hover:bg-black/5"
                  aria-label="Close notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within ToastProvider');
  }

  return ctx;
}
