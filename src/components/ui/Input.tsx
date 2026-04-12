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
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              icon ? 'pl-10' : ''
            } ${endIcon ? 'pr-10' : ''} ${
              error
                ? 'border-error focus:border-error focus:ring-error/20'
                : 'border-gray-300'
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
