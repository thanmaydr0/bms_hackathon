/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, { border: string; bg: string; icon: string; text: string }> = {
  success: { border: 'var(--cp-green)', bg: 'rgba(0,255,159,0.1)', icon: '✓', text: 'var(--cp-green)' },
  error:   { border: 'var(--cp-magenta)', bg: 'rgba(255,0,60,0.15)', icon: '!', text: 'var(--cp-text)' },
  warning: { border: 'var(--cp-yellow)', bg: 'rgba(252,238,10,0.1)', icon: '⚠', text: 'var(--cp-yellow)' },
  info:    { border: 'var(--cp-cyan)', bg: 'rgba(0,240,255,0.1)', icon: 'i', text: 'var(--cp-cyan)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration, createdAt: Date.now() }]);
    if (duration > 0) setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-20 right-0 z-[200] flex flex-col items-end gap-2 pointer-events-none px-4"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const style = toastStyles[toast.type];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 50, skewX: -10 }}
                animate={{ opacity: 1, x: 0, skewX: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ type: 'tween', duration: 0.15 }}
                className="relative w-full max-w-sm pointer-events-auto shadow-md"
              >
                <div 
                  className="border-2 p-3 pr-8 flex items-start gap-3 bg-cp-base clip-angled-tl backdrop-blur-sm"
                  style={{ borderColor: style.border, backgroundColor: style.bg }}
                >
                  {/* Decorative corner block */}
                  <div className="absolute top-0 right-0 w-3 h-3 border-l-2 border-b-2" style={{ borderColor: style.border, backgroundColor: 'var(--cp-void)' }} />
                  
                  {/* Icon */}
                  <div
                    className="w-5 h-5 flex items-center justify-center font-cyber font-bold text-xs shrink-0 bg-cp-void border border-current"
                    style={{ color: style.text }}
                  >
                    {toast.type === 'error' ? <span className="animate-pulse">{style.icon}</span> : style.icon}
                  </div>

                  {/* Message */}
                  <div className="flex flex-col">
                    <span className="font-cyber font-bold text-[9px] uppercase tracking-[0.2em] mb-0.5" style={{ color: style.border }}>
                      SYS_{toast.type.toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-cp-text leading-tight drop-shadow-sm">{toast.message}</span>
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="absolute top-2 right-2 text-cp-dim hover:text-cp-text transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* Depleting progress bar at bottom */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-1 origin-left"
                    style={{ backgroundColor: style.border }}
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
