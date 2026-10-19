import { ReactNode } from 'react';

interface TagProps {
  /**
   * tint    — groen getint (bron-tag "Allerhande", categorie "Groente")
   * outline — rand-pill (receptlabels "Soep", "Vegetarisch")
   * season  — "In seizoen" (zand/bruin)
   */
  variant?: 'tint' | 'outline' | 'season';
  children: ReactNode;
  className?: string;
}

const variantClasses = {
  tint: 'rounded-tag bg-primary-tint px-2.5 py-1 text-[13px] font-semibold text-primary',
  outline: 'rounded-chip border border-line-tag px-3.5 py-1.5 text-[13px] font-medium text-ink-2',
  season: 'rounded-tag bg-season-bg px-2.5 py-1 text-[13px] font-semibold text-season-text',
};

export default function Tag({ variant = 'tint', children, className = '' }: TagProps) {
  return <span className={`inline-flex items-center ${variantClasses[variant]} ${className}`}>{children}</span>;
}
