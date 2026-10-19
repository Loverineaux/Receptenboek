import { ReactNode } from 'react';
import ProfileButton from '@/components/layout/ProfileButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Knoppen rechts (bijv. IconButton zoek/+/scan) */
  actions?: ReactNode;
  /** Avatar-knop naar profiel/instellingen tonen (alleen mobiel). Standaard aan. */
  profileButton?: boolean;
  className?: string;
}

/** Schermtitel (design v2): 34px Bricolage, subtitel 15px ink-3, acties + profielknop rechts. */
export default function ScreenHeader({
  title,
  subtitle,
  actions,
  profileButton = true,
  className = '',
}: ScreenHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 pt-2 ${className}`}>
      <div className="min-w-0">
        <h1 className="font-display text-screen-title font-semibold text-ink text-pretty">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-3">{subtitle}</p>}
      </div>
      {(actions || profileButton) && (
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {actions}
          {profileButton && <ProfileButton />}
        </div>
      )}
    </div>
  );
}
