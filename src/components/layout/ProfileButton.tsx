'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * Avatar-knop naar /profiel (en via daar instellingen), met een groene stip bij
 * ongelezen meldingen. Op mobiel in de kop van elk scherm; op desktop zit dit
 * al in de bovenbalk, dus standaard `md:hidden`.
 */
export default function ProfileButton({ className = 'md:hidden' }: { className?: string }) {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) return null;

  const initial = (profile?.display_name || user.email || '?').trim().charAt(0).toUpperCase();
  const label = unreadCount > 0 ? `Profiel en instellingen (${unreadCount} ongelezen meldingen)` : 'Profiel en instellingen';

  return (
    <Link
      href="/profiel"
      aria-label={label}
      title={label}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-placeholder-3 font-display text-lg font-semibold text-ink-2 ${className}`}
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
      )}
    </Link>
  );
}
