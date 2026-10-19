'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Sparkles, Heart, Carrot, Plus, type LucideIcon } from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon; match: string[] };

// Design v2: Recepten · Wat koken? · [+] · Favorieten · Ingrediënten.
// Collecties zijn bereikbaar via Favorieten en laten die tab actief.
const LEFT: NavItem[] = [
  { href: '/recepten', label: 'Recepten', icon: BookOpen, match: ['/recepten'] },
  { href: '/suggesties', label: 'Wat koken?', icon: Sparkles, match: ['/suggesties'] },
];
const RIGHT: NavItem[] = [
  { href: '/favorieten', label: 'Favorieten', icon: Heart, match: ['/favorieten', '/collecties'] },
  { href: '/ingredienten', label: 'Ingrediënten', icon: Carrot, match: ['/ingredienten'] },
];

/**
 * Schermen met een eigen sticky actiebalk of full-screen flow tonen geen tabbalk
 * (receptdetail, nieuw recept, bewerken, ingrediënt- en collectiedetail, scannen).
 */
const HIDE_ON: RegExp[] = [
  /^\/recepten\/nieuw/,
  /^\/recepten\/[^/]+(\/.*)?$/,
  /^\/ingredienten\/scan/,
  /^\/ingredienten\/[^/]+$/,
  /^\/collecties\/[^/]+$/,
];

export function bottomNavHidden(pathname: string) {
  return HIDE_ON.some((re) => re.test(pathname));
}

function Tab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 pt-1.5"
    >
      {active && <span className="absolute left-1/2 top-0 h-[3px] w-7 -translate-x-1/2 rounded-b-[3px] bg-primary" />}
      <Icon className={`h-6 w-6 ${active ? 'text-primary' : 'text-nav-icon'}`} strokeWidth={active ? 2.1 : 1.9} />
      <span className={`text-[11px] ${active ? 'font-semibold text-primary' : 'font-medium text-ink-3'}`}>
        {item.label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname() || '/';
  if (bottomNavHidden(pathname)) return null;

  return (
    <nav
      data-tour="mobile-nav"
      className="bar-blur fixed inset-x-0 bottom-0 z-40 border-t border-line md:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
    >
      <div className="mx-auto flex max-w-lg items-stretch px-1">
        {LEFT.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="flex flex-1 justify-center">
          <Link
            href="/recepten/nieuw"
            data-tour="fab-button"
            aria-label="Nieuw recept"
            className="-mt-[18px] flex h-14 w-14 items-center justify-center rounded-[19px] bg-primary text-on-primary shadow-fab transition-transform active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={2.2} />
          </Link>
        </div>

        {RIGHT.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
