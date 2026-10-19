import { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Knoppen rechts (bijv. IconButton zoek/+/scan) */
  actions?: ReactNode;
  className?: string;
}

/** Schermtitel (design v2): 34px Bricolage, subtitel 15px ink-3, acties rechts. */
export default function ScreenHeader({ title, subtitle, actions, className = '' }: ScreenHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 pt-2 ${className}`}>
      <div className="min-w-0">
        <h1 className="font-display text-screen-title font-semibold text-ink text-pretty">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
    </div>
  );
}
