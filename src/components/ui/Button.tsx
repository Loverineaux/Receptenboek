'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

// Design v2: primair = bosgroen met groene gloed, secundair = crème kaart met rand.
const variantStyles: Record<string, string> = {
  primary:
    'bg-primary text-on-primary shadow-btn-primary hover:bg-primary-dark focus-visible:ring-primary/40',
  secondary:
    'border border-line bg-surface text-ink hover:bg-gray-50 focus-visible:ring-primary/30',
  danger:
    'bg-error text-white hover:bg-error/90 focus-visible:ring-error/40',
  ghost:
    'text-ink-3 hover:bg-sunk focus-visible:ring-line-strong',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-9 rounded-icon-btn px-3.5 text-sm',
  md: 'h-11 rounded-icon-btn px-4 text-[15px]',
  lg: 'h-[54px] rounded-btn px-6 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
