import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  const variantStyles = {
    success: 'bg-emerald-50/80 border-emerald-300 text-emerald-800',
    warning: 'bg-amber-50/80 border-amber-300 text-amber-800',
    destructive: 'bg-rose-50/80 border-rose-300 text-rose-800',
    info: 'bg-sky-50/80 border-sky-300 text-sky-800',
    neutral: 'bg-slate-100/80 border-slate-300 text-slate-700',
  };

  return (
    <span
      className={cn(
        'shadow-xs inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
