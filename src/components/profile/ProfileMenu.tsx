import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export interface ProfileMenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  /** Optioneel badge-getal rechts (bijv. ongelezen meldingen) */
  badge?: number;
}

/** Menukaart (design v2): rijen van 58px met icoon-tegel, label en chevron. */
export default function ProfileMenu({ items }: { items: ProfileMenuItem[] }): ReactNode {
  return (
    <nav aria-label="Profiel" className="rounded-card-lg border border-line bg-surface px-4">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[58px] items-center gap-3.5 py-2 ${i < items.length - 1 ? 'border-b border-line-soft' : ''}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-sunk text-ink">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-medium text-ink">{item.label}</span>
              {item.description && <span className="mt-px block text-[13px] text-ink-3">{item.description}</span>}
            </span>
            {item.badge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-on-primary">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-4" strokeWidth={2} />
          </Link>
        );
      })}
    </nav>
  );
}
