/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const getTypeStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { borderLeftColor: 'var(--color-safe)', icon: '✅' };
      case 'error':
        return { borderLeftColor: 'var(--color-accent)', icon: '⚠️' };
      case 'warning':
        return { borderLeftColor: 'var(--color-accent-2)', icon: '⚡' };
      case 'info':
      default:
        return { borderLeftColor: 'var(--color-info)', icon: 'ℹ️' };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed top-16 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => {
          const styles = getTypeStyles(toast.type);
          return (
            <div
              key={toast.id}
              className="bg-[var(--color-surface-2)] text-[var(--color-text)] px-4 py-3 rounded-xl shadow-xl border border-[var(--color-border)] border-l-4 pointer-events-auto flex items-center justify-between gap-3 w-full max-w-sm animate-in fade-in slide-in-from-top-4 duration-300"
              style={{ borderLeftColor: styles.borderLeftColor }}
            >
              <div className="flex items-center gap-2">
                <span>{styles.icon}</span>
                <span className="text-sm font-medium leading-tight">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
                aria-label="Close notification"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
