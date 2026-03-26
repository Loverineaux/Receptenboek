'use client';

import { useCallback, useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SearchBar from '@/components/ui/SearchBar';
import CategoryFilter from '@/components/ui/CategoryFilter';
import Button from '@/components/ui/Button';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { RecipeWithRelations, Source } from '@/types';

const PAGE_SIZE = 20;

const sourceOptions: Source[] = [
  'HelloFresh',
  'Albert Heijn',
  'Jumbo',
  'Broodje Dunner',
  'Eigen recept',
];

type SortOption = 'newest' | 'rating' | 'time';

export default function OntdekPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [offset, setOffset] = useState(0);

  const fetchRecipes = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offset;
      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        let query = supabase
          .from('recipes')
          .select(
            `
            *,
            ingredients(*),
            steps(*),
            tags:recipe_tags(tag:tags(*)),
            nutrition(*),
            ratings(*),
            user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
          `,
            { count: 'exact' }
          )
          .eq('is_public', true);

        if (search) {
          query = query.ilike('title', `%${search}%`);
        }

        if (source) {
          query = query.eq('source', source);
        }

        switch (sort) {
          case 'time':
            query = query.order('total_time_minutes', {
              ascending: true,
              nullsFirst: false,
            });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        query = query.range(currentOffset, currentOffset + PAGE_SIZE - 1);

        const { data, count } = await query;

        const processed: RecipeWithRelations[] = (data ?? []).map((r: any) => {
          const ratings = r.ratings ?? [];
          const avg =
            ratings.length > 0
              ? ratings.reduce((s: number, rt: any) => s + rt.score, 0) /
                ratings.length
              : null;

          return {
            ...r,
            tags: (r.tags ?? []).map((rt: any) => rt.tag).filter(Boolean),
            average_rating: avg,
            nutrition: Array.isArray(r.nutrition)
              ? r.nutrition[0] ?? null
              : r.nutrition,
            comments: [],
          };
        });

        let filtered = processed;
        if (category) {
          filtered = processed.filter((r) =>
            r.tags.some((t) => t.name.toLowerCase() === category.toLowerCase())
          );
        }

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

  useEffect(() => {
    fetchRecipes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, source, sort]);

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
      <h1 className="text-2xl font-bold text-text-primary">Ontdek recepten</h1>

      <SearchBar value={search} onChange={setSearch} />
      <CategoryFilter selected={category} onChange={setCategory} />

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

      {!loading && recipes.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="space-y-2">
                <RecipeCard
                  recipe={recipe}
                  onFavoriteToggle={handleFavoriteToggle}
                />
                {/* Author info */}
                {recipe.user && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100">
                      {recipe.user.avatar_url ? (
                        <img
                          src={recipe.user.avatar_url}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-3 w-3 text-text-muted" />
                      )}
                    </div>
                    <span className="text-xs text-text-secondary">
                      {recipe.user.display_name ?? 'Anoniem'}
                    </span>
                  </div>
                )}
              </div>
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

      {!loading && recipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl">🔍</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            Geen recepten gevonden
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Probeer andere zoektermen of filters.
          </p>
        </div>
      )}
    </div>
  );
}
