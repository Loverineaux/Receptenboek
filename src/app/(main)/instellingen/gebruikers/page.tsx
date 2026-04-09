'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, User, ChefHat, Star, Clock, CalendarDays } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

interface UserWithStats {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_seen: string | null;
  recipe_count: number;
  avg_rating: number | null;
  last_recipe_at: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Zojuist';
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} dagen geleden`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} weken geleden`;
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function GebruikersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [filtered, setFiltered] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    // Fetch profiles and recipes in parallel
    const [profilesResult, recipesResult] = await Promise.all([
      supabase.from('profiles').select('id, display_name, avatar_url, created_at, last_seen').order('created_at', { ascending: false }),
      supabase.from('recipes').select('user_id, created_at, ratings(sterren)'),
    ]);

    const { data: profiles } = profilesResult;
    const { data: recipes } = recipesResult;

    if (!profiles) { setLoading(false); return; }

    const statsMap = new Map<string, { count: number; totalRating: number; ratingCount: number; lastAt: string | null }>();

    for (const r of recipes ?? []) {
      const uid = r.user_id;
      const existing = statsMap.get(uid) || { count: 0, totalRating: 0, ratingCount: 0, lastAt: null };
      existing.count++;
      if (!existing.lastAt || r.created_at > existing.lastAt) existing.lastAt = r.created_at;
      for (const rating of (r.ratings ?? []) as any[]) {
        existing.totalRating += rating.sterren;
        existing.ratingCount++;
      }
      statsMap.set(uid, existing);
    }

    const usersWithStats: UserWithStats[] = profiles.map((p: any) => {
      const stats = statsMap.get(p.id);
      return {
        ...p,
        recipe_count: stats?.count ?? 0,
        avg_rating: stats && stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : null,
        last_recipe_at: stats?.lastAt ?? null,
      };
    });

    setUsers(usersWithStats);
    setFiltered(usersWithStats);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) fetchUsers();
  }, [user, authLoading, fetchUsers, router]);

  useEffect(() => {
    if (!search) {
      setFiltered(users);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(users.filter((u) =>
      (u.display_name || '').toLowerCase().includes(q)
    ));
  }, [search, users]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24">
      <div className="sticky top-14 z-20 -mx-4 bg-background px-4 pb-2 pt-4 md:top-16">
        <button
          onClick={() => router.push('/instellingen')}
          className="flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Instellingen
        </button>
      </div>

      <h1 className="mb-4 text-2xl font-bold text-text-primary">Gebruikers</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam..."
          className="w-full rounded-xl border border-gray-200 bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => router.push(`/profiel/${u.id}`)}
              className="flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-surface p-4 text-left transition-colors hover:bg-gray-50"
            >
              {/* Avatar */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary">
                  {u.display_name || 'Anoniem'}
                  {u.id === user?.id && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Jij
                    </span>
                  )}
                </p>

                {/* Stats row */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <ChefHat className="h-3 w-3" />
                    {u.recipe_count} recept{u.recipe_count !== 1 ? 'en' : ''}
                  </span>
                  {u.avg_rating !== null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {u.avg_rating.toFixed(1)} gem. score
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Lid sinds {new Date(u.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {u.last_seen && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Actief {timeAgo(u.last_seen)}
                    </span>
                  )}
                  {u.last_recipe_at && (
                    <span className="flex items-center gap-1">
                      <ChefHat className="h-3 w-3" />
                      Bijdrage {timeAgo(u.last_recipe_at)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <User className="h-12 w-12 text-text-muted/30" />
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            {search ? 'Geen gebruikers gevonden' : 'Nog geen gebruikers'}
          </h2>
          {search && (
            <p className="mt-1 text-sm text-text-secondary">
              Probeer een andere zoekterm.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
