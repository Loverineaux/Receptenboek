'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * square  — 44×44 crème vierkant met rand (headers, filterknop)
   * photo   — 44px cirkel over foto's (terug, delen, favoriet op detailfoto)
   * sunk    — 36px cirkel zandgrijs (sluiten in sheets/modals)
   * primary — 44×44 bosgroen vierkant (bijv. + of scan in een schermtitel)
   * dark    — 44px cirkel voor de donkere kookmodus
   */
  variant?: 'square' | 'photo' | 'sunk' | 'primary' | 'dark';
  /** Toon de groene "actieve filters"-stip rechtsboven */
  dot?: boolean;
  /** Verplicht voor toegankelijkheid: er staat alleen een icoon in de knop */
  label: string;
}

const variantClasses: Record<NonNullable<IconButtonProps['variant']>, string> = {
  square: 'h-11 w-11 rounded-icon-btn border border-line bg-surface text-ink hover:bg-gray-50',
  photo: 'h-11 w-11 rounded-full bg-[rgba(255,253,248,0.92)] text-ink shadow-sm backdrop-blur hover:bg-surface',
  sunk: 'h-9 w-9 rounded-full bg-sunk text-ink hover:bg-line',
  primary: 'h-11 w-11 rounded-icon-btn bg-primary text-on-primary shadow-btn-primary hover:bg-primary-dark',
  dark: 'h-11 w-11 rounded-full bg-white/10 text-on-primary hover:bg-white/15',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'square', dot = false, label, className = '', children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`relative inline-flex shrink-0 items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
      {dot && <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full bg-primary" />}
    </button>
  )
);

IconButton.displayName = 'IconButton';

export default IconButton;
