import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  /** Rechts: aantal ("6 recepten") of actie-link ("Beheer"), in primary */
  action?: ReactNode;
  className?: string;
}

/** Sectiekop (design v2): 22px Bricolage, 26px boven / 12px onder, actie rechts in primary. */
export default function SectionHeader({ title, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`mb-3 mt-[26px] flex items-baseline justify-between gap-3 ${className}`}>
      <h2 className="font-display text-section font-semibold text-ink">{title}</h2>
      {action && <div className="shrink-0 text-[15px] font-semibold text-primary">{action}</div>}
    </div>
  );
}
