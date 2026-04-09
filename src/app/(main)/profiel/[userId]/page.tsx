'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { User, ChefHat, Star, CalendarDays, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeRefresh } from '@/hooks/useRealtimeSubscription';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { RecipeWithRelations } from '@/types';

interface ProfileStats {
  recipe_count: number;
  avg_rating: number | null;
  last_recipe_at: string | null;
  last_seen: string | null;
  member_since: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
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

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/users/${params.userId}/profile`);
    if (!res.ok) {
      setLoading(false);
      return;
    }

    const data = await res.json();
    setProfile(data.profile);
    setStats(data.stats);

    // Process recipes
    const processed: RecipeWithRelations[] = (data.recipes ?? []).map((r: any) => {
      const ratings = r.ratings ?? [];
      const avg = ratings.length > 0
        ? ratings.reduce((s: number, rt: any) => s + rt.sterren, 0) / ratings.length
        : null;

      return {
        ...r,
        tags: (r.tags ?? []).map((rt: any) => rt.tag).filter(Boolean),
        average_rating: avg,
        nutrition: null,
        steps: [],
        comments: r.comments ?? [],
        user: data.profile,
      };
    });

    // Check favorites and favorite counts in parallel
    if (currentUser) {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const ids = processed.map((r) => r.id);

      const [favsResult, fcResult] = await Promise.all([
        supabase.from('favorites').select('recipe_id').eq('user_id', currentUser.id),
        fetch('/api/recipes/favorite-counts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe_ids: ids }),
        }).then((r) => (r.ok ? r.json() : { counts: {} })).catch(() => ({ counts: {} })),
      ]);

      const favIds = new Set((favsResult.data ?? []).map((f: any) => f.recipe_id));
      const favCounts: Record<string, number> = fcResult.counts ?? {};

      setRecipes(processed.map((r) => ({
        ...r,
        is_favorited: favIds.has(r.id),
        favorite_count: favCounts[r.id] || 0,
      })));
    } else {
      setRecipes(processed);
    }

    setLoading(false);
  }, [params.userId, currentUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Realtime: profile and recipe changes
  useRealtimeRefresh({ table: 'profiles', filter: `id=eq.${params.userId}`, onAnyChange: fetchProfile, enabled: !!profile });
  useRealtimeRefresh({ table: 'recipes', filter: `user_id=eq.${params.userId}`, onAnyChange: fetchProfile, enabled: !!profile });

  const handleFavoriteToggle = (recipeId: string, isFavorited: boolean) => {
    if (!currentUser) return;

    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              is_favorited: isFavorited,
              favorite_count: Math.max(0, ((r as any).favorite_count || 0) + (isFavorited ? 1 : -1)),
            }
          : r
      )
    );

    fetch(`/api/recipes/${recipeId}/favorite`, {
      method: isFavorited ? 'POST' : 'DELETE',
    }).then((res) => {
      if (!res.ok) {
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === recipeId
              ? {
                  ...r,
                  is_favorited: !isFavorited,
                  favorite_count: Math.max(0, ((r as any).favorite_count || 0) + (isFavorited ? -1 : 1)),
                }
              : r
          )
        );
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold text-text-primary">
          Gebruiker niet gevonden
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-100">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? ''}
              fill
              className="object-cover"
            />
          ) : (
            <User className="h-8 w-8 text-text-muted" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {profile.display_name ?? 'Anoniem'}
          </h1>
          {profile.bio && (
            <p className="mt-1 max-w-md text-sm text-text-secondary">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-surface p-3 text-center">
            <ChefHat className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-1 text-lg font-bold text-text-primary">{stats.recipe_count}</p>
            <p className="text-[11px] text-text-muted">Recepten</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-surface p-3 text-center">
            <Star className="mx-auto h-5 w-5 text-yellow-500" />
            <p className="mt-1 text-lg font-bold text-text-primary">
              {stats.avg_rating !== null ? stats.avg_rating.toFixed(1) : '—'}
            </p>
            <p className="text-[11px] text-text-muted">Gem. beoordeling</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-surface p-3 text-center">
            <CalendarDays className="mx-auto h-5 w-5 text-blue-500" />
            <p className="mt-1 text-sm font-bold text-text-primary">{formatDate(stats.member_since)}</p>
            <p className="text-[11px] text-text-muted">Lid sinds</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-surface p-3 text-center">
            <Clock className="mx-auto h-5 w-5 text-green-500" />
            <p className="mt-1 text-sm font-bold text-text-primary">
              {stats.last_seen ? timeAgo(stats.last_seen) : '—'}
            </p>
            <p className="text-[11px] text-text-muted">Laatst actief</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-surface p-3 text-center">
            <ChefHat className="mx-auto h-5 w-5 text-orange-500" />
            <p className="mt-1 text-sm font-bold text-text-primary">
              {stats.last_recipe_at ? timeAgo(stats.last_recipe_at) : '—'}
            </p>
            <p className="text-[11px] text-text-muted">Laatste bijdrage</p>
          </div>
        </div>
      )}

      {/* Recipes grid */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">
          Recepten ({recipes.length})
        </h2>
        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl">📭</span>
            <p className="mt-3 text-sm text-text-secondary">
              Deze gebruiker heeft nog geen recepten.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
