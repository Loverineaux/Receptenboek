'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChefHat, LayoutGrid, List, Plus, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { recordTiming } from '@/lib/telemetry';
import { readRecipesCardCache, writeRecipesCardCache } from '@/lib/recipes-card-cache';
import { useAuth } from '@/hooks/useAuth';
import SearchBar from '@/components/ui/SearchBar';
import CategoryFilter from '@/components/ui/CategoryFilter';
import Button from '@/components/ui/Button';
import RecipeCard from '@/components/recipes/RecipeCard';
import HeroRecipeCard from '@/components/recipes/HeroRecipeCard';
import IconButton from '@/components/ui/IconButton';
import SectionHeader from '@/components/ui/SectionHeader';
import ProfileButton from '@/components/layout/ProfileButton';
import dynamic from 'next/dynamic';
import PullToRefresh from '@/components/ui/PullToRefresh';

const AddToCollectionModal = dynamic(() => import('@/components/recipes/AddToCollectionModal'));
const ShareModal = dynamic(() => import('@/components/ui/ShareModal'));
import MobileFilterSheet from '@/components/ui/MobileFilterSheet';
import { useCollectionRecipeIds } from '@/hooks/useCollectionRecipeIds';
import type { RecipeWithRelations, Source } from '@/types';

type SortOption = 'newest' | 'rating' | 'time' | 'az' | 'za';

const PAGE_SIZE = 24;

/**
 * `tijd` is vrije tekst ("25 min", "1 uur", "1 uur 15 min", "1,5 uur").
 * Geeft het aantal minuten of null als er geen tijd uit te halen valt.
 */
function parseMinutes(tijd: string | null | undefined): number | null {
  if (!tijd) return null;
  const t = tijd.toLowerCase().replace(',', '.');
  const hours = t.match(/(\d+(?:\.\d+)?)\s*(?:uur|u\b|h\b)/);
  const mins = t.match(/(\d+)\s*(?:min|m\b)/);
  if (hours || mins) {
    return Math.round((hours ? parseFloat(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0));
  }
  const plain = t.match(/^\s*(\d+)\s*$/);
  return plain ? parseInt(plain[1], 10) : null;
}

const QUICK_MAX_MINUTES = 30;

export default function ReceptenPageWrapper() {
  return (
    <Suspense>
      <ReceptenPage />
    </Suspense>
  );
}

function ReceptenPage() {
  const { user, loading: authLoading } = useAuth();
  const collectionRecipeIds = useCollectionRecipeIds();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(0);
  // fetchRecipes reads current recipes via a ref so it can skip the loading
  // spinner when the cache or prior fetch already filled the list.
  const recipesRef = useRef<RecipeWithRelations[]>([]);
  recipesRef.current = recipes;
  // Set synchronously by the hydrate effect so the very next fetchRecipes
  // call knows the UI already shows cached recipes. Prevents the flash of
  // "spinner-without-recepten" that happens when setRecipes from hydrate
  // hasn't committed yet by the time fetchRecipes reads recipesRef.
  const skipLoadingOnceRef = useRef(false);

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
  // "Snel"-chip: bereidingstijd ≤ 30 min, client-side (tijd is vrije tekst)
  const [quick, setQuick] = useState(searchParams.get('snel') === '1');
  const [filterOpen, setFilterOpen] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  // Pas true als de stats (beoordelingen) van de eerste fetch binnen zijn; voorkomt
  // dat de hero eerst een willekeurig recept toont en daarna wisselt.
  const [statsReady, setStatsReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recepten-layout');
      if (saved === 'list' || saved === 'grid') setLayout(saved);
    } catch {}
  }, []);

  const toggleLayout = () => {
    const next = layout === 'grid' ? 'list' : 'grid';
    setLayout(next);
    try { localStorage.setItem('recepten-layout', next); } catch {}
  };

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('cat', category);
    if (quick) params.set('snel', '1');
    if (source) params.set('bron', source);
    if (includedSources.size > 0) params.set('inbron', [...includedSources].join(','));
    if (excludedSources.size > 0) params.set('exbron', [...excludedSources].join(','));
    if (sort !== 'newest') params.set('sort', sort);
    if (searchIngredients) params.set('ing', '1');
    const qs = params.toString();
    const target = `/recepten${qs ? `?${qs}` : ''}`;
    // Niet navigeren als de URL al klopt: elke router.replace is een RSC-request
    // (middleware + root layout met sessie- en profielquery), ook op de eerste mount.
    if (`${window.location.pathname}${window.location.search}` === target) return;
    router.replace(target, { scroll: false });
  }, [search, category, quick, source, includedSources, excludedSources, sort, searchIngredients, router]);

  // Fetch unique sources from DB (select only bron, limit to 500 to avoid huge payload)
  useEffect(() => {
    const fetchSources = async () => {
      const { data } = await supabase
        .from('recipes')
        .select('bron')
        .not('bron', 'is', null)
        .not('bron', 'eq', '')
        .limit(500);
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
      // Default view = no filters, default sort, first page. Only default-view
      // gets the localStorage stale-while-revalidate treatment.
      const isDefaultView =
        !loadMore &&
        !search &&
        !category &&
        !source &&
        includedSources.size === 0 &&
        excludedSources.size === 0 &&
        sort === 'newest';
      const havePrevRecipes = recipesRef.current.length > 0;
      const skipLoading = skipLoadingOnceRef.current;
      skipLoadingOnceRef.current = false;

      if (loadMore) {
        setLoadingMore(true);
      } else {
        // Don't flip to loading spinner if we're already showing recipes
        // (either from the in-memory state or the hydrated cache). The
        // background refresh replaces them silently when it completes.
        if (!havePrevRecipes && !skipLoading) setLoading(true);
        pageRef.current = 0;
      }

      const tStart = performance.now();
      try {
        const page = loadMore ? pageRef.current + 1 : 0;
        const from = page * PAGE_SIZE;

        // Ingredient search stays client-side (multi-table intersection).
        // When active we resolve recipe IDs here and pass them to the warm
        // server endpoint as ?ids=...  Everything else — category, search,
        // source/include/exclude, sort — is handled server-side.
        let ingredientRecipeIds: string[] | null = null;
        if (search && searchIngredients) {
          const words = search.trim().split(/\s+/).filter(Boolean);
          const matchSets = await Promise.all(
            words.map(async (word) => {
              const [ingResult, titleResult] = await Promise.all([
                supabase.from('ingredients').select('recipe_id').ilike('naam', `%${word}%`),
                supabase.from('recipes').select('id').or(`title.ilike.%${word}%,subtitle.ilike.%${word}%`),
              ]);
              return new Set([
                ...(ingResult.data ?? []).map((i: any) => i.recipe_id),
                ...(titleResult.data ?? []).map((t: any) => t.id),
              ]);
            })
          );
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

        // Build query string for the warm server endpoint
        const params = new URLSearchParams();
        params.set('offset', String(from));
        params.set('limit', String(PAGE_SIZE));
        params.set('sort', sort);
        if (category) params.set('category', category);
        if (source) params.set('source', source);
        if (includedSources.size > 0) params.set('included', [...includedSources].join(','));
        if (excludedSources.size > 0) params.set('excluded', [...excludedSources].join(','));
        if (search && !searchIngredients) params.set('search', search);
        if (ingredientRecipeIds && ingredientRecipeIds.length > 0) {
          params.set('ids', ingredientRecipeIds.join(','));
        }

        const tQuery = performance.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        let res: Response;
        try {
          res = await fetch(`/api/recipes/cards?${params.toString()}`, {
            credentials: 'same-origin',
            signal: controller.signal,
            cache: 'no-store',
          });
        } catch (err: any) {
          clearTimeout(timer);
          recordTiming('recepten.mainQuery', performance.now() - tQuery, {
            loadMore,
            error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network'),
          });
          console.error('[Recepten] /api/recipes/cards fetch failed:', err?.message || err);
          setLoading(false);
          setLoadingMore(false);
          return;
        }
        clearTimeout(timer);
        recordTiming('recepten.mainQuery', performance.now() - tQuery, {
          loadMore,
          status: res.status,
        });

        if (!res.ok) {
          console.error('[Recepten] /api/recipes/cards error:', res.status);
          setLoading(false);
          setLoadingMore(false);
          return;
        }

        const payload = (await res.json()) as {
          recipes: Array<Record<string, unknown>>;
          total: number;
        };
        const data = payload.recipes ?? [];
        const count = payload.total ?? 0;

        // Cards are already flattened on the server
        const processed: RecipeWithRelations[] = data.map((r: any) => ({
          ...r,
          average_rating: null,
          rating_count: 0,
          comment_count: 0,
          favorite_count: 0,
          ratings: [],
          comments: [],
          ingredients: [],
          nutrition: null,
          steps: [],
        }));

        // Show cards immediately (images + titles + tags visible)
        if (loadMore) {
          setRecipes((prev) => [...prev, ...processed]);
        } else {
          setRecipes(processed);
        }
        setTotalCount(count ?? 0);
        pageRef.current = page;
        setLoading(false);
        setLoadingMore(false);

        // Cache the default view so the next cold open is instant.
        if (isDefaultView) {
          writeRecipesCardCache(userIdRef.current, {
            recipes: processed,
            total: count ?? 0,
          });
        }

        recordTiming('recepten.total', performance.now() - tStart, {
          loadMore,
          rows: processed.length,
        });

        // Fetch stats + user favorites in background, merge when ready
        const ids = processed.map((r) => r.id);
        if (ids.length > 0) {
          const currentUserId = userIdRef.current;
          const [statsResult, favIds] = await Promise.all([
            supabase.rpc('get_recipe_stats', { p_recipe_ids: ids }),
            currentUserId
              ? supabase.from('favorites').select('recipe_id').eq('user_id', currentUserId)
                  .then(({ data }) => new Set((data ?? []).map((f: any) => f.recipe_id)))
              : Promise.resolve(new Set<string>()),
          ]);

          // Convert stats array to lookup map
          const stats: Record<string, any> = {};
          for (const s of statsResult.data ?? []) {
            stats[s.recipe_id] = s;
          }

          setRecipes((prev) => {
            const updated = prev.map((r) => {
              const s = stats[r.id];
              if (!s) return r;
              return {
                ...r,
                average_rating: s.avg_rating ?? r.average_rating,
                rating_count: s.rating_count ?? r.rating_count,
                comment_count: s.comment_count ?? r.comment_count,
                favorite_count: s.favorite_count ?? r.favorite_count,
                is_favorited: favIds.has(r.id),
              };
            });
            // Client-side sorting for rating (after stats are available)
            if (sort === 'rating') {
              updated.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
            }
            return updated;
          });
        }
      } catch (err: any) {
        console.error('[Recepten] fetchRecipes threw:', err?.message || err, err);
        recordTiming('recepten.error', performance.now() - tStart, {
          loadMore,
          message: err?.message || String(err),
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setStatsReady(true);
      }
    },
    [supabase, search, searchIngredients, category, source, includedSources, excludedSources, sort]
  );

  // Hydrate from the localStorage cache on the very first render of the
  // default view — shows the last-seen recipes instantly while the real
  // fetch runs in the background. Never hard-refreshes; if the fetch
  // takes forever or fails, the cached list stays visible.
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    if (!user?.id) return;
    const isDefaultView =
      !search && !category && !source &&
      includedSources.size === 0 && excludedSources.size === 0 &&
      sort === 'newest';
    if (!isDefaultView) return;
    const cached = readRecipesCardCache<{ recipes: RecipeWithRelations[]; total: number }>(user.id);
    if (cached && cached.recipes?.length > 0) {
      setRecipes(cached.recipes);
      setTotalCount(cached.total ?? cached.recipes.length);
      setLoading(false);
      // Tell the next fetchRecipes call (running in the same commit before
      // setRecipes has re-rendered) that the UI is already populated.
      skipLoadingOnceRef.current = true;
    }
    hasHydratedRef.current = true;
  }, [user?.id, search, category, source, includedSources, excludedSources, sort]);

  // Fetch recipes once session is read from cookie (instant via getSession)
  useEffect(() => {
    if (authLoading) return;
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, search, searchIngredients, category, source, includedSources, excludedSources, sort]);

  // Favorites are now fetched in parallel inside fetchRecipes — no separate waterfall needed

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
        id, title, image_url, bron, tijd, created_at,
        tags:recipe_tags(tag:tags(id, name))
      `).eq('id', newId).single();
      if (data) {
        const flatTags = ((data as any).tags ?? []).map((rt: any) => rt.tag).filter(Boolean);
        const newRecipe = { ...data, tags: flatTags, average_rating: null, rating_count: 0, comment_count: 0, comments: [], ratings: [], ingredients: [], nutrition: null, steps: [], is_favorited: false, favorite_count: 0 } as any;
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

    // Favorites: only update count for OTHER users' favorites (own favorites are handled by optimistic update)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'favorites' }, (payload) => {
      const recipeId = payload.new?.recipe_id;
      if (!recipeId || payload.new?.user_id === userIdRef.current) return;
      setRecipes((prev) => prev.map((r) =>
        r.id === recipeId ? { ...r, favorite_count: Math.max(0, ((r as any).favorite_count || 0) + 1) } : r
      ));
    });
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'favorites' }, (payload) => {
      const recipeId = payload.old?.recipe_id;
      if (!recipeId || payload.old?.user_id === userIdRef.current) return;
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
          r.id === recipeId ? { ...r, ratings: data as any, average_rating: avg, rating_count: data.length } : r
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

  const hasSourceFilters = !!source || includedSources.size > 0 || excludedSources.size > 0;
  const isDefaultView = !search && !category && !quick && !hasSourceFilters && sort === 'newest';
  const hasQuery = !!search || !!category || quick || hasSourceFilters;
  const chipCategories = ['vegetarisch', 'pasta', 'soep', 'dessert'];
  const activeFilterCount =
    (source ? 1 : 0) +
    includedSources.size +
    excludedSources.size +
    (sort !== 'newest' ? 1 : 0) +
    (category && !chipCategories.includes(category.toLowerCase()) ? 1 : 0) +
    (searchIngredients ? 1 : 0);

  const visibleRecipes = quick
    ? recipes.filter((r) => {
        const m = parseMinutes(r.tijd);
        return m !== null && m <= QUICK_MAX_MINUTES;
      })
    : recipes;
  const hasMore = recipes.length < totalCount;

  // "Snel" filtert client-side: laad door tot er genoeg snelle recepten staan
  useEffect(() => {
    if (!quick || loading || loadingMore || !hasMore) return;
    if (visibleRecipes.length < 8) fetchRecipesRef.current(true);
  }, [quick, loading, loadingMore, hasMore, visibleRecipes.length]);

  // Hero "Voor vanavond": alleen op de standaardweergave, eerlijk gelabeld, stabiel per dag
  const hero = useMemo(() => {
    if (!isDefaultView || !statsReady) return null;
    const pool = recipes.slice(0, PAGE_SIZE).filter((r) => r.image_url);
    if (pool.length === 0) return null;
    const day = Math.floor(Date.now() / 86400000);
    const rated = pool
      .filter((r) => (r.rating_count ?? 0) > 0 && (r.average_rating ?? 0) > 0)
      .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
      .slice(0, 5);
    if (rated.length > 0) return { recipe: rated[day % rated.length], label: 'Hoog beoordeeld' };
    return { recipe: pool[day % pool.length], label: 'Uitgelicht' };
  }, [recipes, isDefaultView, statsReady]);

  const countLabel = `${visibleRecipes.length}${quick && hasMore ? '+' : ''} ${visibleRecipes.length === 1 && !(quick && hasMore) ? 'recept' : 'recepten'}`;
  const resetAll = () => {
    setSearch('');
    setCategory(null);
    setQuick(false);
    setSource('');
    setIncludedSources(new Set());
    setExcludedSources(new Set());
    setSort('newest');
    setSearchIngredients(false);
  };

  return (
    <PullToRefresh onRefresh={fetchRecipes}>
    <div>
      <h1 className="sr-only">Recepten</h1>

      {/* Kop: logo · zoeken · filter · avatar (logo en avatar alleen mobiel; desktop heeft de topbalk) */}
      <div className="flex items-center gap-2.5 pt-2 md:pt-0">
        <Link
          href="/recepten"
          aria-label="Receptenboek"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon-btn bg-primary text-on-primary md:hidden"
        >
          <ChefHat className="h-[23px] w-[23px]" strokeWidth={1.9} />
        </Link>
        <div className="min-w-0 flex-1 md:max-w-xl md:flex-none md:basis-full">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Zoek recept of ingrediënt"
            searchIngredients={searchIngredients}
          />
        </div>
        <IconButton
          label={activeFilterCount > 0 ? `Filters (${activeFilterCount} actief)` : 'Filters'}
          dot={activeFilterCount > 0}
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal className="h-[19px] w-[19px]" strokeWidth={1.9} />
        </IconButton>
        <ProfileButton />
      </div>

      <div className="mt-[18px]">
        <CategoryFilter
          selected={category}
          onChange={setCategory}
          quick={quick}
          onQuickChange={setQuick}
        />
      </div>

      <MobileFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        activeCount={activeFilterCount}
        category={category}
        onCategoryChange={(c) => { setCategory(c); setQuick(false); }}
        searchIngredients={searchIngredients}
        onSearchIngredientsChange={setSearchIngredients}
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
        onResetAll={resetAll}
      />

      {/* Actieve bronfilters */}
      {(includedSources.size > 0 || excludedSources.size > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[...includedSources].map((s) => (
            <button key={`i-${s}`} type="button"
              aria-label={`Bronfilter ${s} verwijderen`}
              onClick={() => setIncludedSources((prev) => { const next = new Set(prev); next.delete(s); return next; })}
              className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-primary bg-primary-tint px-3 text-meta font-semibold text-primary">
              {s} <span aria-hidden>&times;</span>
            </button>
          ))}
          {[...excludedSources].map((s) => (
            <button key={`e-${s}`} type="button"
              aria-label={`Verborgen bron ${s} weer tonen`}
              onClick={() => setExcludedSources((prev) => { const next = new Set(prev); next.delete(s); return next; })}
              className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-red-200 bg-red-50 px-3 text-meta font-semibold text-red-700 line-through">
              {s} <span aria-hidden>&times;</span>
            </button>
          ))}
        </div>
      )}

      {/* Voor vanavond */}
      {hero && !loading && (
        <section className="mt-[22px]">
          <h2 className="mb-2.5 text-meta font-semibold text-ink-3">Voor vanavond</h2>
          <HeroRecipeCard recipe={hero.recipe} label={hero.label} />
        </section>
      )}

      <SectionHeader
        title={isDefaultView ? 'Recent toegevoegd' : hasQuery ? 'Resultaten' : 'Alle recepten'}
        className="!mt-7"
        action={
          !loading && recipes.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span className="text-[13.5px]">{countLabel}</span>
              <button
                type="button"
                onClick={toggleLayout}
                aria-label={layout === 'grid' ? 'Toon als lijst' : 'Toon als raster'}
                className="-my-2.5 -mr-2.5 flex h-11 w-11 items-center justify-center rounded-full text-ink-3 hover:text-ink"
              >
                {layout === 'grid' ? <List className="h-5 w-5" strokeWidth={2} /> : <LayoutGrid className="h-5 w-5" strokeWidth={2} />}
              </button>
            </span>
          ) : undefined
        }
      />

      {/* Loading skeleton */}
      {loading && (
        <div role="status" aria-label="Recepten laden" className="grid grid-cols-2 gap-x-3.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2.5">
              <div className="h-[164px] rounded-card bg-sunk" />
              <div className="h-4 w-4/5 rounded bg-sunk" />
              <div className="h-3 w-1/3 rounded bg-sunk" />
            </div>
          ))}
        </div>
      )}

      {/* Recipe grid / list */}
      {!loading && visibleRecipes.length > 0 && (
        <>
          <div
            className={
              layout === 'grid'
                ? 'grid grid-cols-2 gap-x-3.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4'
                : 'flex flex-col gap-2.5 md:grid md:grid-cols-2'
            }
          >
            {visibleRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                layout={layout}
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

          {hasMore && (
            <div className="flex justify-center pt-8">
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

      {/* Snel-filter zoekt nog door */}
      {!loading && quick && visibleRecipes.length === 0 && (hasMore || loadingMore) && (
        <p className="py-16 text-center text-[15px] text-ink-3">Snelle recepten zoeken...</p>
      )}

      {/* Empty state */}
      {!loading && visibleRecipes.length === 0 && !(quick && (hasMore || loadingMore)) && (
        hasQuery ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="font-display text-section font-semibold text-ink">Geen recepten gevonden</h2>
            <p className="mt-1 text-[15px] text-ink-3">Pas je zoekopdracht of filters aan.</p>
            <Button variant="secondary" size="lg" className="mt-5" onClick={resetAll}>
              Filters wissen
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="font-display text-section font-semibold text-ink">Nog geen recepten</h2>
            <p className="mt-1 text-[15px] text-ink-3">Voeg je eerste recept toe!</p>
            <Link href="/recepten/nieuw">
              <Button variant="primary" size="lg" className="mt-5">
                <Plus className="h-4 w-4" />
                Nieuw recept
              </Button>
            </Link>
          </div>
        )
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
