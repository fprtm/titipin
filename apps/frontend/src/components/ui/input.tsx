import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, errorMessage, leftIcon, rightIcon, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            type={type}
            ref={ref}
            aria-invalid={hasError ? 'true' : undefined}
            className={cn(
              'glass-input h-11 w-full rounded-xl text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none',
              leftIcon ? 'pl-10' : 'px-4',
              rightIcon ? 'pr-11' : 'px-4',
              hasError &&
                'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-slate-400">{rightIcon}</div>
          )}
        </div>
        {errorMessage && (
          <p className="animate-in fade-in text-xs font-medium text-rose-600 duration-150">
            {errorMessage}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
