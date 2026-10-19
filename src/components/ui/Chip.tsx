'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
  /** 'dark' voor gebruik op de donkere kookmodus-achtergrond */
  tone?: 'light' | 'dark';
}

/**
 * Pill-chip (design v2): actief = bosgroen met zandtekst, inactief = crème met rand.
 * Gebruik in horizontale rijen met `flex gap-2 overflow-x-auto scrollbar-none`.
 */
export default function Chip({
  active = false,
  icon,
  tone = 'light',
  className = '',
  children,
  type = 'button',
  ...props
}: ChipProps) {
  const toneClasses =
    tone === 'dark'
      ? 'border border-white/25 bg-transparent text-cook-soft hover:bg-white/10'
      : active
        ? 'border border-primary bg-primary text-on-primary'
        : 'border border-line bg-surface text-ink hover:bg-gray-50';

  return (
    <button
      type={type}
      aria-pressed={tone === 'light' ? active : undefined}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-chip px-4 text-sm font-medium transition-colors duration-150 ${toneClasses} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
