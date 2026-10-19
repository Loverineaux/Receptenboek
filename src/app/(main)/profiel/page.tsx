'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Bell, ShieldCheck, Settings, UserPen, UserCog } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { jsonFetcher, SWR_PAGE_OPTIONS } from '@/lib/swr';
import IconButton from '@/components/ui/IconButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileMenu, { type ProfileMenuItem } from '@/components/profile/ProfileMenu';

const ConfirmDialog = dynamic(() => import('@/components/ui/ConfirmDialog'));

interface ProfileStatsData {
  recipe_count: number;
  collection_count: number | null;
  cooked_count: number | null;
  member_since: string | null;
}

export default function ProfielPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  // SWR-cache: terugnavigeren toont direct de vorige statistieken
  const { data: stats = null } = useSWR<ProfileStatsData | null>(
    user ? ['profile-stats', user.id] : null,
    async () => {
      try {
        const data = await jsonFetcher<{ stats?: ProfileStatsData }>(`/api/users/${user!.id}/profile`);
        return data?.stats ?? null;
      } catch {
        return null;
      }
    },
    SWR_PAGE_OPTIONS
  );
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const name = profile?.display_name || 'Naamloze kok';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const memberSince = stats?.member_since ?? (profile as any)?.created_at ?? null;
  const memberLabel = memberSince
    ? new Date(memberSince).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    : null;

  const items: ProfileMenuItem[] = [
    {
      href: '/instellingen/mijn-recepten',
      icon: BookOpen,
      label: 'Mijn recepten',
      description: stats ? `${stats.recipe_count} eigen en geïmporteerd` : undefined,
    },
    { href: '/profiel/bewerken', icon: UserPen, label: 'Profiel bewerken', description: 'Naam, foto en bio' },
    { href: '/instellingen/meldingen', icon: Bell, label: 'Meldingen', description: 'Push en voorkeuren' },
    { href: '/instellingen/account', icon: UserCog, label: 'Account', description: 'Wachtwoord en privacy' },
  ];
  if (isAdmin) {
    items.push({ href: '/admin', icon: ShieldCheck, label: 'Beheer', description: 'Beheer van Receptenboek' });
  }

  return (
    <div className="mx-auto max-w-[640px]">
      {/* Acties rechtsboven: meldingen (alleen mobiel, desktop heeft de topbalk) + instellingen */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-icon-btn border border-line bg-surface md:hidden [&>div>button]:h-11 [&>div>button]:w-11 [&>div>button]:rounded-icon-btn">
          <NotificationBell />
        </div>
        <IconButton label="Instellingen" onClick={() => router.push('/instellingen')}>
          <Settings className="h-[19px] w-[19px]" strokeWidth={1.9} />
        </IconButton>
      </div>

      <div className="flex flex-col items-center pt-1 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-placeholder">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt={`Profielfoto van ${name}`} fill sizes="96px" className="object-cover" />
          ) : (
            <span className="font-display text-[37px] font-semibold text-ink-2">{initial}</span>
          )}
        </div>
        <h1 className="mt-3.5 font-display text-[29px] font-semibold leading-none text-ink">{name}</h1>
        {memberLabel && <p className="mt-1.5 text-sm text-ink-3">Kookt sinds {memberLabel}</p>}
      </div>

      <div className="mt-[22px]">
        <ProfileStats
          recipes={stats?.recipe_count ?? null}
          collections={stats?.collection_count ?? null}
          cooked={stats?.cooked_count ?? null}
        />
      </div>

      <div className="mt-4">
        <ProfileMenu items={items} />
      </div>

      <div className="mt-5 flex items-center justify-center gap-1 text-[13.5px] text-ink-3">
        <Link href="/instellingen/over" className="inline-flex min-h-[44px] items-center px-2 hover:text-ink">
          Over Receptenboek
        </Link>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="inline-flex min-h-[44px] items-center px-2 hover:text-ink"
        >
          Uitloggen
        </button>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Uitloggen"
        message="Weet je zeker dat je wilt uitloggen?"
        confirmLabel="Uitloggen"
        variant="primary"
        onConfirm={handleSignOut}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
