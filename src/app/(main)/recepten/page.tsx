'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SearchBar from '@/components/ui/SearchBar';
import CategoryFilter from '@/components/ui/CategoryFilter';
import Button from '@/components/ui/Button';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { RecipeWithRelations, Source } from '@/types';

type SortOption = 'newest' | 'rating' | 'time';

export default function ReceptenPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize filters from URL params
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState<string | null>(searchParams.get('cat') || null);
  const [source, setSource] = useState(searchParams.get('bron') || '');
  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'newest');
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('cat', category);
    if (source) params.set('bron', source);
    if (sort !== 'newest') params.set('sort', sort);
    const qs = params.toString();
    router.replace(`/recepten${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [search, category, source, sort, router]);

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
    async () => {
      setLoading(true);

      try {
        let query = supabase
          .from('recipes')
          .select(
            `
            id, title, subtitle, image_url, bron, tijd, moeilijkheid, categorie, created_at,
            ingredients(naam),
            tags:recipe_tags(tag:tags(id, name)),
            ratings(sterren),
            comments(id),
            user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
          `
          );

        if (search) {
          query = query.ilike('title', `%${search}%`);
        }

        if (source) {
          query = query.eq('bron', source);
        }

        switch (sort) {
          case 'time':
            query = query.order('tijd', { ascending: true, nullsFirst: false });
            break;
          case 'rating':
          case 'newest':
          default:
            query = query.order('created_at', { ascending: false });
        }

        const { data, error: queryError } = await query;

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
            steps: [],
          };
        });

        // Client-side category filter — simply check tags
        let filtered = processed;
        if (category) {
          const cat = category.toLowerCase();
          filtered = processed.filter((r) =>
            r.tags.some((t: any) => (t.name || '').toLowerCase() === cat)
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

        setRecipes(filtered);
      } finally {
        setLoading(false);
      }
    },
    [supabase, user, search, category, source, sort]
  );

  // Re-fetch when filters change
  useEffect(() => {
    fetchRecipes();
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

    </div>
  );
}
