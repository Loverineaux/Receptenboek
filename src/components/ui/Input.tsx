'use client';

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  endIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, endIcon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-[13px] font-semibold text-ink-3"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`h-11 w-full rounded-input border bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-4 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${
              icon ? 'pl-10' : ''
            } ${endIcon ? 'pr-10' : ''} ${
              error
                ? 'border-error focus:border-error focus:ring-error/20'
                : 'border-line'
            } ${className}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && props.type !== 'search') {
                (e.target as HTMLInputElement).blur();
              }
              props.onKeyDown?.(e);
            }}
            {...props}
          />
          {endIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {endIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
