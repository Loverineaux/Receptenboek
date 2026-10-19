'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { jsonFetcher, SWR_PAGE_OPTIONS } from '@/lib/swr';
import RecipeCard from '@/components/recipes/RecipeCard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import SectionHeader from '@/components/ui/SectionHeader';
import IconButton from '@/components/ui/IconButton';
import NewCollectionModal from '@/components/collections/NewCollectionModal';
import {
  CollectionCarouselCard,
  NewCollectionCarouselCard,
} from '@/components/collections/CollectionCarouselCard';
import dynamic from 'next/dynamic';

const AddToCollectionModal = dynamic(() => import('@/components/recipes/AddToCollectionModal'));
import { useCollectionRecipeIds } from '@/hooks/useCollectionRecipeIds';
import type { CollectionWithDetails, RecipeWithRelations } from '@/types';

// Haalt de favoriete recepten van een gebruiker op (Supabase-client)
async function fetchFavoriteRecipes(userId: string): Promise<RecipeWithRelations[]> {
  const supabase = createClient();

  // Get favorite recipe IDs
  const { data: favs } = await supabase
    .from('favorites')
    .select('recipe_id')
    .eq('user_id', userId);

  const favIds = (favs ?? []).map((f: any) => f.recipe_id);
  if (favIds.length === 0) return [];

  // Fetch those recipes
  const { data } = await supabase
    .from('recipes')
    .select(`
      id, title, subtitle, image_url, bron, tijd, moeilijkheid, created_at,
      ingredients(naam),
      tags:recipe_tags(tag:tags(id, name)),
      ratings(sterren),
      comments(id),
      user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
    `)
    .in('id', favIds)
    .order('created_at', { ascending: false });

  return (data ?? []).map((r: any) => {
    const ratings = r.ratings ?? [];
    const avg =
      ratings.length > 0
        ? ratings.reduce((s: number, rt: any) => s + rt.sterren, 0) / ratings.length
        : null;

    return {
      ...r,
      tags: (r.tags ?? []).map((rt: any) => rt.tag).filter(Boolean),
      average_rating: avg,
      nutrition: null,
      steps: [],
      is_favorited: true,
    };
  });
}

export default function FavorietenPage() {
  const { user, loading: authLoading } = useAuth();
  const collectionRecipeIds = useCollectionRecipeIds();

  // SWR-cache: terugnavigeren toont direct de vorige lijst en ververst stil op de achtergrond
  const { data: recipesData, mutate: mutateFavorites } = useSWR<RecipeWithRelations[]>(
    user ? ['favorites-page', user.id] : null,
    () => fetchFavoriteRecipes(user!.id),
    SWR_PAGE_OPTIONS
  );
  // Gedeelde key met de collecties-pagina
  const { data: collectionsData, mutate: mutateCollections } = useSWR<CollectionWithDetails[]>(
    user ? ['collections', user.id] : null,
    () => jsonFetcher<CollectionWithDetails[]>('/api/collections'),
    SWR_PAGE_OPTIONS
  );

  const recipes = useMemo(() => recipesData ?? [], [recipesData]);
  const collections = useMemo(
    () => (Array.isArray(collectionsData) ? collectionsData : []),
    [collectionsData]
  );
  const loading = authLoading || (!!user && recipesData === undefined);

  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Realtime: favorites changes
  useEffect(() => {
    if (!user) return;
    const sb = createClient();
    const channel = sb.channel('favorites-realtime');
    const refresh = () => mutateFavorites();
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'favorites' }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'favorites' }, refresh)
      .subscribe();
    return () => { sb.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Alleen eigen, gevolgde en gedeelde collecties in de carrousel
  const myCollections = useMemo(
    () =>
      user
        ? collections.filter((c) => c.user_id === user.id || c.is_following || c.is_collaborator)
        : [],
    [collections, user]
  );

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.ingredients ?? []).some((i) => i.naam?.toLowerCase().includes(q)) ||
        (r.tags ?? []).some((t) => t.name?.toLowerCase().includes(q))
    );
  }, [recipes, query]);

  // Optimistisch: hartje uit = direct weg uit de lijst; bij een fout herstellen
  const handleFavoriteToggle = async (recipeId: string, isFavorited: boolean) => {
    if (!user) return;

    if (isFavorited) {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'POST' });
      return;
    }

    mutateFavorites((prev) => (prev ?? []).filter((r) => r.id !== recipeId), { revalidate: false });
    try {
      const res = await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'DELETE' });
      if (!res.ok) mutateFavorites();
    } catch {
      mutateFavorites();
    }
  };

  const toggleSearch = () => {
    setSearchOpen((open) => {
      if (open) setQuery('');
      return !open;
    });
  };

  const subtitle = loading
    ? ' '
    : `${recipes.length} ${recipes.length === 1 ? 'recept' : 'recepten'} bewaard`;

  const grid = 'grid grid-cols-2 gap-x-3.5 gap-y-[22px] md:grid-cols-3 lg:grid-cols-4';

  return (
    <div>
      <ScreenHeader
        title="Favorieten"
        subtitle={subtitle}
        actions={
          <IconButton
            label={searchOpen ? 'Zoeken sluiten' : 'Zoeken in favorieten'}
            aria-expanded={searchOpen}
            onClick={toggleSearch}
          >
            {searchOpen ? (
              <X className="h-[19px] w-[19px]" strokeWidth={1.9} />
            ) : (
              <Search className="h-[19px] w-[19px]" strokeWidth={1.9} />
            )}
          </IconButton>
        }
      />

      {searchOpen && (
        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3"
            strokeWidth={1.9}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek in je favorieten"
            aria-label="Zoek in je favorieten"
            autoFocus
            className="h-11 w-full rounded-input border border-line bg-surface pl-10 pr-3.5 text-[15px] text-ink placeholder:text-ink-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      )}

      {/* Collecties */}
      {user && (
        <>
          <SectionHeader title="Collecties" action={<Link href="/collecties">Beheer</Link>} />
          <div className="scrollbar-none -mx-gutter flex gap-3 overflow-x-auto px-gutter md:mx-0 md:px-0">
            {myCollections.map((c) => (
              <CollectionCarouselCard key={c.id} collection={c} />
            ))}
            <NewCollectionCarouselCard onClick={() => setCreateOpen(true)} />
          </div>
        </>
      )}

      {/* Alle favorieten */}
      <SectionHeader title="Alle favorieten" />

      {loading ? (
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[200px] animate-pulse rounded-card bg-sunk" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-card-lg border-[1.5px] border-dashed border-line-strong px-5 py-7 text-center text-[14.5px] text-ink-3">
          Tik op het hartje bij een recept om het hier te bewaren.
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-card-lg border-[1.5px] border-dashed border-line-strong px-5 py-7 text-center text-[14.5px] text-ink-3">
          Geen favorieten gevonden voor &ldquo;{query.trim()}&rdquo;.
        </div>
      ) : (
        <div className={grid}>
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onFavoriteToggle={handleFavoriteToggle}
              onAddToCollection={(id) => setCollectionRecipeId(id)}
              isInCollection={collectionRecipeIds.has(recipe.id)}
            />
          ))}
        </div>
      )}

      {collectionRecipeId && (
        <AddToCollectionModal
          recipeId={collectionRecipeId}
          open={!!collectionRecipeId}
          onClose={() => setCollectionRecipeId(null)}
        />
      )}

      <NewCollectionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(c) => mutateCollections((prev) => [c, ...(prev ?? [])], { revalidate: false })}
      />
    </div>
  );
}
