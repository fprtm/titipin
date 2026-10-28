'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  description?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

export interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
    warning: (message: string, options?: ToastOptions) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const duration = options?.duration ?? 4000;

      const newToast: ToastItem = {
        id,
        type,
        message,
        description: options?.description,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast],
  );

  const toastMethods = useMemo(
    () => ({
      success: (message: string, options?: ToastOptions) => showToast('success', message, options),
      error: (message: string, options?: ToastOptions) => showToast('error', message, options),
      info: (message: string, options?: ToastOptions) => showToast('info', message, options),
      warning: (message: string, options?: ToastOptions) => showToast('warning', message, options),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        toast: toastMethods,
      }}
    >
      {children}

      {/* Floating Glass Toast Notification Viewport */}
      <div
        role="region"
        aria-label="Notifikasi"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((item) => {
          let icon = <Info className="h-5 w-5 text-sky-600 shrink-0" />;
          let borderClass = 'border-sky-300';
          let accentBg = 'bg-sky-50 text-sky-800';

          if (item.type === 'success') {
            icon = <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
            borderClass = 'border-emerald-300';
            accentBg = 'bg-emerald-50 text-emerald-800';
          } else if (item.type === 'error') {
            icon = <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />;
            borderClass = 'border-rose-300';
            accentBg = 'bg-rose-50 text-rose-800';
          } else if (item.type === 'warning') {
            icon = <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />;
            borderClass = 'border-amber-300';
            accentBg = 'bg-amber-50 text-amber-800';
          }

          return (
            <div
              key={item.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border ${borderClass} bg-white/95 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-200`}
            >
              <div className={`p-1 rounded-xl ${accentBg}`}>{icon}</div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{item.message}</p>
                {item.description && (
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

const defaultToastMethods = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      showToast: () => {},
      dismissToast: () => {},
      toast: defaultToastMethods,
    };
  }
  return context;
}
