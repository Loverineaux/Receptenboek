'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SearchBar from '@/components/ui/SearchBar';
import CategoryFilter from '@/components/ui/CategoryFilter';
import Button from '@/components/ui/Button';
import RecipeCard from '@/components/recipes/RecipeCard';
import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/ui/PullToRefresh';

const AddToCollectionModal = dynamic(() => import('@/components/recipes/AddToCollectionModal'));
const ShareModal = dynamic(() => import('@/components/ui/ShareModal'));
import MobileFilterSheet from '@/components/ui/MobileFilterSheet';
import { useCollectionRecipeIds } from '@/hooks/useCollectionRecipeIds';
import type { RecipeWithRelations, Source } from '@/types';

type SortOption = 'newest' | 'rating' | 'time' | 'az' | 'za';

const PAGE_SIZE = 24;

export default function ReceptenPageWrapper() {
  return (
    <Suspense>
      <ReceptenPage />
    </Suspense>
  );
}

function ReceptenPage() {
  const { user } = useAuth();
  const collectionRecipeIds = useCollectionRecipeIds();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(0);

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
      // Only fetch the bron column, deduplicate client-side
      const { data } = await supabase
        .from('recipes')
        .select('bron')
        .not('bron', 'is', null);
      if (data) {
        const unique = Array.from(new Set(data.map((r: any) => r.bron).filter(Boolean))) as string[];
        unique.sort((a, b) => a.localeCompare(b));
        setSourceOptions(unique);
      }
    };
    fetchSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecipes = useCallback(
    async (loadMore = false) => {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        pageRef.current = 0;
      }

      try {
        const page = loadMore ? pageRef.current + 1 : 0;
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // Pre-query: if category filter is active, get matching recipe IDs via tags
        let categoryRecipeIds: string[] | null = null;
        if (category) {
          const { data: tagMatches } = await supabase
            .from('recipe_tags')
            .select('recipe_id, tag:tags!inner(name)')
            .ilike('tags.name', category);
          categoryRecipeIds = (tagMatches ?? []).map((t: any) => t.recipe_id);
          if (categoryRecipeIds.length === 0) {
            if (!loadMore) setRecipes([]);
            setTotalCount(0);
            setLoading(false);
            setLoadingMore(false);
            return;
          }
        }

        // Pre-query: if searching by ingredients, get matching recipe IDs
        let ingredientRecipeIds: string[] | null = null;
        if (search && searchIngredients) {
          const words = search.trim().split(/\s+/).filter(Boolean);
          // Find recipes where ingredients match ALL words
          const matchSets: Set<string>[] = [];
          for (const word of words) {
            const { data: ingMatches } = await supabase
              .from('ingredients')
              .select('recipe_id')
              .ilike('naam', `%${word}%`);
            // Also check title/subtitle matches
            const { data: titleMatches } = await supabase
              .from('recipes')
              .select('id')
              .or(`title.ilike.%${word}%,subtitle.ilike.%${word}%`);
            const ids = new Set([
              ...(ingMatches ?? []).map((i: any) => i.recipe_id),
              ...(titleMatches ?? []).map((t: any) => t.id),
            ]);
            matchSets.push(ids);
          }
          // Intersect all sets — recipe must match ALL words
          if (matchSets.length > 0) {
            const intersection = matchSets.reduce((a, b) => new Set([...a].filter((x) => b.has(x))));
            ingredientRecipeIds = [...intersection];
            if (ingredientRecipeIds.length === 0) {
              if (!loadMore) setRecipes([]);
              setTotalCount(0);
              setLoading(false);
              setLoadingMore(false);
              return;
            }
          }
        }

        // Combine ID filters
        let filteredIds: string[] | null = null;
        if (categoryRecipeIds && ingredientRecipeIds) {
          const catSet = new Set(categoryRecipeIds);
          filteredIds = ingredientRecipeIds.filter((id) => catSet.has(id));
        } else {
          filteredIds = categoryRecipeIds || ingredientRecipeIds;
        }

        let query = supabase
          .from('recipes')
          .select(
            `
            id, title, subtitle, image_url, bron, tijd, moeilijkheid, created_at,
            ingredients(naam),
            tags:recipe_tags(tag:tags(id, name)),
            ratings(sterren, user_id),
            comments(id),
            user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
          `,
            { count: 'exact' }
          );

        // Apply pre-queried ID filter
        if (filteredIds) {
          query = query.in('id', filteredIds);
        }

        // Server-side multi-word search on title + subtitle
        if (search && !searchIngredients) {
          const words = search.trim().split(/\s+/).filter(Boolean);
          for (const word of words) {
            query = query.or(`title.ilike.%${word}%,subtitle.ilike.%${word}%`);
          }
        }

        // Server-side source filtering
        if (source) {
          query = query.eq('bron', source);
        } else if (includedSources.size > 0) {
          query = query.in('bron', [...includedSources]);
        }
        if (excludedSources.size > 0) {
          query = query.not('bron', 'in', `(${[...excludedSources].join(',')})`);
        }

        // Server-side sorting
        switch (sort) {
          case 'time':
            query = query.order('tijd', { ascending: true, nullsFirst: false });
            break;
          case 'az':
            query = query.order('title', { ascending: true });
            break;
          case 'za':
            query = query.order('title', { ascending: false });
            break;
          case 'rating':
          case 'newest':
          default:
            query = query.order('created_at', { ascending: false });
        }

        // Apply pagination
        query = query.range(from, to);

        const { data, count, error: queryError } = await query;

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

        // Client-side sorting for rating (needs all loaded data)
        if (sort === 'rating' && !loadMore) {
          processed.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
        }

        // Fetch favorites + counts in parallel
        let result = processed;
        if (user && result.length > 0) {
          const ids = result.map((r) => r.id);
          const [favsResult, fcResult] = await Promise.all([
            supabase
              .from('favorites')
              .select('recipe_id')
              .eq('user_id', user.id),
            fetch('/api/recipes/favorite-counts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipe_ids: ids }),
            }).then((r) => r.ok ? r.json() : { counts: {} }).catch(() => ({ counts: {} })),
          ]);

          const favIds = new Set((favsResult.data ?? []).map((f: any) => f.recipe_id));
          const favCounts: Record<string, number> = fcResult.counts ?? {};

          result = result.map((r) => ({
            ...r,
            is_favorited: favIds.has(r.id),
            favorite_count: favCounts[r.id] || 0,
          }));
        }

        if (loadMore) {
          setRecipes((prev) => [...prev, ...result]);
        } else {
          setRecipes(result);
        }
        setTotalCount(count ?? 0);
        pageRef.current = page;
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [supabase, user, search, searchIngredients, category, source, includedSources, excludedSources, sort]
  );

  // Re-fetch when filters change
  useEffect(() => {
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchIngredients, category, source, includedSources, excludedSources, sort, user?.id]);

  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [initialUserRatings, setInitialUserRatings] = useState<Record<string, number>>({});

  // Realtime: update individual recipe cards without full page refresh
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;
  const fetchRecipesRef = useRef(fetchRecipes);
  fetchRecipesRef.current = fetchRecipes;

  useEffect(() => {
    const sb = createClient();
    const channel = sb.channel('library-realtime');

    // Recipes: new → fetch just the new recipe and prepend, update → patch in place, delete → remove
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recipes' }, async (payload) => {
      const newId = payload.new?.id;
      if (!newId) return;
      const { data } = await sb.from('recipes').select(`
        id, title, image_url, bron, tijd, moeilijkheid, created_at,
        ingredients(naam),
        tags:recipe_tags(tag:tags(id, name)),
        ratings(sterren, user_id),
        comments(id),
        user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
      `).eq('id', newId).single();
      if (data) {
        const ratings = (data as any).ratings ?? [];
        const avg = ratings.length > 0 ? ratings.reduce((s: number, r: any) => s + r.sterren, 0) / ratings.length : null;
        const flatTags = ((data as any).tags ?? []).map((rt: any) => rt.tag).filter(Boolean);
        const newRecipe = { ...data, tags: flatTags, average_rating: avg, nutrition: null, steps: [], is_favorited: false, favorite_count: 0 } as any;
        setRecipes((prev) => [newRecipe, ...prev]);
      }
    });
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'recipes' }, (payload) => {
      setRecipes((prev) => prev.map((r) =>
        r.id === payload.new.id ? { ...r, title: payload.new.title, image_url: payload.new.image_url, tijd: payload.new.tijd, bron: payload.new.bron } : r
      ));
    });
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'recipes' }, (payload) => {
      setRecipes((prev) => prev.filter((r) => r.id !== payload.old.id));
    });

    // Favorites: optimistic count update (no API call needed)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'favorites' }, (payload) => {
      const recipeId = payload.new?.recipe_id;
      if (!recipeId) return;
      setRecipes((prev) => prev.map((r) =>
        r.id === recipeId ? { ...r, favorite_count: Math.max(0, ((r as any).favorite_count || 0) + 1) } : r
      ));
    });
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'favorites' }, (payload) => {
      const recipeId = payload.old?.recipe_id;
      if (!recipeId) return;
      setRecipes((prev) => prev.map((r) =>
        r.id === recipeId ? { ...r, favorite_count: Math.max(0, ((r as any).favorite_count || 0) - 1) } : r
      ));
    });

    // Ratings: refetch from DB and sync initialUserRatings to prevent double-counting
    const handleRatingChange = async (recipeId: string) => {
      await new Promise((r) => setTimeout(r, 200));
      const { data } = await sb.from('ratings').select('sterren, user_id').eq('recipe_id', recipeId);
      if (data) {
        const avg = data.length > 0 ? data.reduce((s: number, r: any) => s + r.sterren, 0) / data.length : null;
        setRecipes((prev) => prev.map((r) =>
          r.id === recipeId ? { ...r, ratings: data as any, average_rating: avg } : r
        ));
        const uid = userIdRef.current;
        if (uid) {
          const myRating = data.find((r: any) => r.user_id === uid);
          if (myRating) {
            setInitialUserRatings((prev) => ({ ...prev, [recipeId]: myRating.sterren }));
            setUserRatings((prev) => ({ ...prev, [recipeId]: myRating.sterren }));
          } else {
            setInitialUserRatings((prev) => { const n = { ...prev }; delete n[recipeId]; return n; });
            setUserRatings((prev) => { const n = { ...prev }; delete n[recipeId]; return n; });
          }
        }
      }
    };
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ratings' }, (payload) => {
      if (payload.new?.recipe_id) handleRatingChange(payload.new.recipe_id);
    });
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ratings' }, (payload) => {
      if (payload.new?.recipe_id) handleRatingChange(payload.new.recipe_id);
    });
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'ratings' }, (payload) => {
      if (payload.old?.recipe_id) handleRatingChange(payload.old.recipe_id);
    });

    channel.subscribe();
    return () => { sb.removeChannel(channel); };
  }, []);

  // Silently refresh tags after 5s for recipes without tags (to pick up auto-categorize results)
  useEffect(() => {
    const recipesWithoutTags = recipes.filter((r) => !r.tags || r.tags.length === 0);
    if (recipesWithoutTags.length === 0) return;
    const timer = setTimeout(async () => {
      const ids = recipesWithoutTags.map((r) => r.id);
      const { data } = await supabase
        .from('recipes')
        .select('id, tags:recipe_tags(tag:tags(id, name))')
        .in('id', ids);
      if (!data) return;
      const tagMap = new Map(data.map((r: any) => [
        r.id,
        (r.tags ?? []).map((rt: any) => rt.tag).filter(Boolean),
      ]));
      setRecipes((prev) =>
        prev.map((r) => {
          const newTags = tagMap.get(r.id);
          if (newTags && newTags.length > 0 && JSON.stringify(newTags) !== JSON.stringify(r.tags)) {
            return { ...r, tags: newTags };
          }
          return r;
        })
      );
    }, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes.length]);

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
      <div className="sticky top-[3.75rem] z-30 -mx-4 space-y-3 bg-background px-4 pb-3 pt-2 shadow-sm md:-mx-6 md:top-[4.25rem] md:px-6">
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

          {recipes.length < totalCount && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                size="lg"
                loading={loadingMore}
                onClick={() => fetchRecipes(true)}
              >
                Laad meer ({totalCount - recipes.length} resterend)
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
