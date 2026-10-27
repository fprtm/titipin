import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'glass' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const variantStyles = {
      default:
        'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm active:scale-[0.98] border border-transparent',
      glass: 'glass-button text-slate-800 hover:bg-white/95 active:scale-[0.98]',
      secondary:
        'bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-[0.98] border border-transparent',
      outline:
        'border border-slate-200 bg-transparent text-slate-700 hover:bg-white/70 active:scale-[0.98]',
      destructive:
        'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] shadow-sm border border-transparent',
      ghost:
        'bg-transparent text-slate-700 hover:bg-slate-100/70 active:scale-[0.98] border border-transparent',
    };

    const sizeStyles = {
      sm: 'h-9 px-3.5 text-xs rounded-lg gap-1.5',
      default: 'h-11 px-5 text-sm font-medium rounded-xl gap-2',
      lg: 'h-12 sm:h-13 px-6 sm:px-8 text-base font-semibold rounded-2xl gap-2.5',
      icon: 'h-11 w-11 p-0 flex items-center justify-center rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
