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
import AddToCollectionModal from '@/components/recipes/AddToCollectionModal';
import ShareModal from '@/components/ui/ShareModal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import MobileFilterSheet from '@/components/ui/MobileFilterSheet';
import { useCollectionRecipeIds } from '@/hooks/useCollectionRecipeIds';
import type { RecipeWithRelations, Source } from '@/types';

type SortOption = 'newest' | 'rating' | 'time' | 'az' | 'za';

export default function ReceptenPage() {
  const { user } = useAuth();
  const collectionRecipeIds = useCollectionRecipeIds();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize filters from URL params
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState<string | null>(searchParams.get('cat') || null);
  const [source, setSource] = useState(searchParams.get('bron') || '');
  const [includedSources, setIncludedSources] = useState<Set<string>>(() => {
    const inc = searchParams.get('inbron');
    return inc ? new Set(inc.split(',')) : new Set();
  });
  const [excludedSources, setExcludedSources] = useState<Set<string>>(() => {
    const ex = searchParams.get('exbron');
    return ex ? new Set(ex.split(',')) : new Set();
  });
  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'newest');
  const [searchIngredients, setSearchIngredients] = useState(searchParams.get('ing') === '1');
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('cat', category);
    if (source) params.set('bron', source);
    if (includedSources.size > 0) params.set('inbron', [...includedSources].join(','));
    if (excludedSources.size > 0) params.set('exbron', [...excludedSources].join(','));
    if (sort !== 'newest') params.set('sort', sort);
    if (searchIngredients) params.set('ing', '1');
    const qs = params.toString();
    router.replace(`/recepten${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [search, category, source, includedSources, excludedSources, sort, searchIngredients, router]);

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
            ratings(sterren, user_id),
            comments(id),
            user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
          `
          );

        // Don't server-filter when searching ingredients (need all recipes for client-side filter)

        // Source filtering done client-side (supports exclude mode)

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

        // Client-side search filter
        let filtered = processed;
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter((r) => {
            const titleMatch = r.title.toLowerCase().includes(q);
            if (titleMatch) return true;
            if (searchIngredients) {
              return (r.ingredients || []).some((i: any) =>
                (i.naam || '').toLowerCase().includes(q)
              );
            }
            return false;
          });
        }

        // Client-side source filter (include or exclude)
        if (source) {
          filtered = filtered.filter((r) => (r.bron || '') === source);
        }
        if (includedSources.size > 0) {
          filtered = filtered.filter((r) => includedSources.has(r.bron || ''));
        }
        if (excludedSources.size > 0) {
          filtered = filtered.filter((r) => !excludedSources.has(r.bron || ''));
        }

        // Client-side category filter — simply check tags
        if (category) {
          const cat = category.toLowerCase();
          filtered = processed.filter((r) =>
            r.tags.some((t: any) => (t.name || '').toLowerCase() === cat)
          );
        }

        // Client-side sorting
        if (sort === 'rating') {
          filtered.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
        } else if (sort === 'az') {
          filtered.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
        } else if (sort === 'za') {
          filtered.sort((a, b) => b.title.localeCompare(a.title, 'nl'));
        }

        // Check favorites + counts
        if (user) {
          const { data: favs } = await supabase
            .from('favorites')
            .select('recipe_id')
            .eq('user_id', user.id);

          const favIds = new Set((favs ?? []).map((f: any) => f.recipe_id));

          // Fetch favorite counts in bulk
          let favCounts: Record<string, number> = {};
          try {
            const ids = filtered.map((r) => r.id);
            const fcRes = await fetch('/api/recipes/favorite-counts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipe_ids: ids }),
            });
            if (fcRes.ok) {
              const fcData = await fcRes.json();
              favCounts = fcData.counts ?? {};
            }
          } catch {}

          filtered = filtered.map((r) => ({
            ...r,
            is_favorited: favIds.has(r.id),
            favorite_count: favCounts[r.id] || 0,
          }));
        }

        setRecipes(filtered);
      } finally {
        setLoading(false);
      }
    },
    [supabase, user, search, searchIngredients, category, source, includedSources, excludedSources, sort]
  );

  // Re-fetch when filters change
  useEffect(() => {
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchIngredients, category, source, includedSources, excludedSources, sort, user?.id]);

  // Silently refresh tags after 5s to pick up auto-categorize results
  useEffect(() => {
    if (recipes.length === 0) return;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('recipes')
        .select('id, tags:recipe_tags(tag:tags(id, name))');
      if (!data) return;
      const tagMap = new Map(data.map((r: any) => [
        r.id,
        (r.tags ?? []).map((rt: any) => rt.tag).filter(Boolean),
      ]));
      setRecipes((prev) =>
        prev.map((r) => {
          const newTags = tagMap.get(r.id);
          if (newTags && JSON.stringify(newTags) !== JSON.stringify(r.tags)) {
            return { ...r, tags: newTags };
          }
          return r;
        })
      );
    }, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes.length]);

  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [initialUserRatings, setInitialUserRatings] = useState<Record<string, number>>({});
  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);
  const [shareRecipeId, setShareRecipeId] = useState<string | null>(null);

  // Load user's ratings
  useEffect(() => {
    if (!user) return;
    supabase.from('ratings').select('recipe_id, sterren').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = {};
          data.forEach((r: any) => { map[r.recipe_id] = r.sterren; });
          setUserRatings(map);
          setInitialUserRatings(map);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleRate = async (recipeId: string, rating: number) => {
    if (!user) return;

    if (rating === 0) {
      setUserRatings((prev) => { const n = { ...prev }; delete n[recipeId]; return n; });
    } else {
      setUserRatings((prev) => ({ ...prev, [recipeId]: rating }));
    }

    // Persist to DB
    await fetch(`/api/recipes/${recipeId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sterren: rating }),
    });
  };

  const handleFavoriteToggle = (recipeId: string, isFavorited: boolean) => {
    if (!user) return;

    // Optimistic update: instant UI change including count
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

    // Fire-and-forget API call, rollback on failure
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

  return (
    <PullToRefresh onRefresh={fetchRecipes}>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Receptenbibliotheek</h1>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30 -mx-4 space-y-3 bg-background px-4 pb-3 pt-1 shadow-sm md:-mx-6 md:px-6">
      <SearchBar
        value={search}
        onChange={setSearch}
        searchIngredients={searchIngredients}
        onSearchIngredientsChange={setSearchIngredients}
      />

      <CategoryFilter selected={category} onChange={setCategory} />

      <MobileFilterSheet
        source={source}
        onSourceChange={(v) => { setSource(v); if (v) { setIncludedSources(new Set()); setExcludedSources(new Set()); } }}
        sourceOptions={sourceOptions.map((s) => ({ value: s, label: s }))}
        includedSources={includedSources}
        onIncludedSourceToggle={(s) => {
          setIncludedSources((prev) => {
            const next = new Set(prev);
            if (next.has(s)) next.delete(s); else next.add(s);
            return next;
          });
          setSource('');
        }}
        onClearIncluded={() => setIncludedSources(new Set())}
        excludedSources={excludedSources}
        onExcludedSourceToggle={(s) => {
          setExcludedSources((prev) => {
            const next = new Set(prev);
            if (next.has(s)) next.delete(s); else next.add(s);
            return next;
          });
          // Remove from included if it was there
          setIncludedSources((prev) => { const next = new Set(prev); next.delete(s); return next; });
          setSource('');
        }}
        onClearExcluded={() => setExcludedSources(new Set())}
        sort={sort}
        onSortChange={(v) => setSort(v as SortOption)}
        sortOptions={[
          { value: 'newest', label: 'Nieuwste' },
          { value: 'rating', label: 'Beoordeling' },
          { value: 'time', label: 'Bereidingstijd' },
          { value: 'az', label: 'A → Z' },
          { value: 'za', label: 'Z → A' },
        ]}
      />

      {/* Active source filter chips (mobile) */}
      {(includedSources.size > 0 || excludedSources.size > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 md:hidden">
          {[...includedSources].map((s) => (
            <button key={`i-${s}`} type="button"
              onClick={() => setIncludedSources((prev) => { const next = new Set(prev); next.delete(s); return next; })}
              className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {s} <span className="text-green-400">&times;</span>
            </button>
          ))}
          {[...excludedSources].map((s) => (
            <button key={`e-${s}`} type="button"
              onClick={() => setExcludedSources((prev) => { const next = new Set(prev); next.delete(s); return next; })}
              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 line-through">
              {s} <span className="text-red-400">&times;</span>
            </button>
          ))}
        </div>
      )}
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
                onRate={user ? handleRate : undefined}
                userRating={userRatings[recipe.id]}
                initialUserRating={initialUserRatings[recipe.id] ?? 0}
                onAddToCollection={user ? (id) => setCollectionRecipeId(id) : undefined}
                isInCollection={collectionRecipeIds.has(recipe.id)}
                onShare={user ? (id) => setShareRecipeId(id) : undefined}
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

      {/* Add to collection modal */}
      {collectionRecipeId && (
        <AddToCollectionModal
          recipeId={collectionRecipeId}
          open={!!collectionRecipeId}
          onClose={() => setCollectionRecipeId(null)}
        />
      )}

      {/* Share modal */}
      {shareRecipeId && (
        <ShareModal
          open={!!shareRecipeId}
          onClose={() => setShareRecipeId(null)}
          title={recipes.find((r) => r.id === shareRecipeId)?.title || 'Recept'}
          url={typeof window !== 'undefined' ? `${window.location.origin}/recepten/${shareRecipeId}` : ''}
          shareType="recipe"
          itemId={shareRecipeId}
        />
      )}
    </div>
    </PullToRefresh>
  );
}
