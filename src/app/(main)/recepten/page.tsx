'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SearchBar from '@/components/ui/SearchBar';
import CategoryFilter from '@/components/ui/CategoryFilter';
import Button from '@/components/ui/Button';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { RecipeWithRelations, Source } from '@/types';

const PAGE_SIZE = 20;

type SortOption = 'newest' | 'rating' | 'time';

export default function ReceptenPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [offset, setOffset] = useState(0);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);

  // Fetch unique sources from DB
  useEffect(() => {
    const fetchSources = async () => {
      const { data } = await supabase
        .from('recipes')
        .select('bron');
      if (data) {
        const unique = [...new Set(data.map((r: any) => r.bron).filter(Boolean))] as string[];
        unique.sort((a, b) => a.localeCompare(b));
        setSourceOptions(unique);
      }
    };
    fetchSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecipes = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offset;

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        let query = supabase
          .from('recipes')
          .select(
            `
            id, title, subtitle, image_url, bron, tijd, moeilijkheid, created_at,
            tags:recipe_tags(tag:tags(id, name)),
            ratings(sterren),
            comments(id),
            user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
          `,
            { count: 'exact' }
          );

        if (search) {
          query = query.ilike('title', `%${search}%`);
        }

        if (source) {
          query = query.eq('bron', source);
        }

        switch (sort) {
          case 'time':
            query = query.order('tijd', {
              ascending: true,
              nullsFirst: false,
            });
            break;
          case 'rating':
          case 'newest':
          default:
            query = query.order('created_at', { ascending: false });
        }

        query = query.range(currentOffset, currentOffset + PAGE_SIZE - 1);

        const { data, count, error: queryError } = await query;

        console.log('[Recepten] Query result:', { count, error: queryError?.message, dataLength: data?.length });
        if (queryError) {
          console.error('[Recepten] Supabase error:', queryError);
        }

        // Post-process
        const processed: RecipeWithRelations[] = (data ?? []).map((r: any) => {
          const ratings = r.ratings ?? [];
          const avg =
            ratings.length > 0
              ? ratings.reduce((s: number, rt: any) => s + rt.sterren, 0) /
                ratings.length
              : null;

          const flatTags = (r.tags ?? [])
            .map((rt: any) => rt.tag)
            .filter(Boolean);

          return {
            ...r,
            tags: flatTags,
            average_rating: avg,
            nutrition: null,
            ingredients: [],
            steps: [],
            comments: [],
          };
        });

        // Client-side category filter (tag-based)
        let filtered = processed;
        if (category) {
          filtered = processed.filter((r) =>
            r.tags.some(
              (t) => t.name.toLowerCase() === category.toLowerCase()
            )
          );
        }

        // Client-side rating sort
        if (sort === 'rating') {
          filtered.sort(
            (a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0)
          );
        }

        // Check favorites
        if (user) {
          const { data: favs } = await supabase
            .from('favorites')
            .select('recipe_id')
            .eq('user_id', user.id);

          const favIds = new Set((favs ?? []).map((f: any) => f.recipe_id));
          filtered = filtered.map((r) => ({
            ...r,
            is_favorited: favIds.has(r.id),
          }));
        }

        if (reset) {
          setRecipes(filtered);
          setOffset(PAGE_SIZE);
        } else {
          setRecipes((prev) => [...prev, ...filtered]);
          setOffset((prev) => prev + PAGE_SIZE);
        }

        setTotal(count ?? 0);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [supabase, user, search, category, source, sort, offset]
  );

  // Re-fetch when filters change
  useEffect(() => {
    fetchRecipes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, source, sort, user?.id]);

  const handleFavoriteToggle = async (recipeId: string, isFavorited: boolean) => {
    if (!user) return;

    if (isFavorited) {
      await supabase.from('favorites').insert({
        recipe_id: recipeId,
        user_id: user.id,
      });
    } else {
      await supabase
        .from('favorites')
        .delete()
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id);
    }

    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, is_favorited: isFavorited } : r
      )
    );
  };

  const hasMore = recipes.length < total;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Mijn recepten</h1>

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Category filter */}
      <CategoryFilter selected={category} onChange={setCategory} />

      {/* Source + Sort row */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Alle bronnen</option>
          {sourceOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="newest">Nieuwste</option>
          <option value="rating">Beoordeling</option>
          <option value="time">Bereidingstijd</option>
        </select>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      )}

      {/* Recipe grid */}
      {!loading && recipes.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                loading={loadingMore}
                onClick={() => fetchRecipes(false)}
              >
                Meer laden
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl">🍽️</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            Nog geen recepten
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Voeg je eerste recept toe!
          </p>
          <Link href="/recepten/nieuw">
            <Button variant="primary" size="lg" className="mt-4">
              <Plus className="h-4 w-4" />
              Nieuw recept
            </Button>
          </Link>
        </div>
      )}

      {/* Floating action button */}
      <Link
        href="/recepten/nieuw"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
