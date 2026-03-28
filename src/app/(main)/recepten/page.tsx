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

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [sort, setSort] = useState<SortOption>('newest');
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

        // Client-side category filter
        let filtered = processed;
        if (category) {
          const cat = category.toLowerCase();
          filtered = processed.filter((r) => {
            if (r.tags.some((t) => t.name.toLowerCase() === cat)) return true;
            if (r.categorie && r.categorie.toLowerCase().includes(cat)) return true;
            const titleLower = r.title.toLowerCase();
            const ingNames = (r.ingredients || []).map((i: any) => (i.naam || '').toLowerCase()).join(' ');
            const allText = `${titleLower} ${ingNames}`;
            const meatWords = ['kip', 'chicken', 'biefstuk', 'gehakt', 'runder', 'varken', 'spek', 'bacon', 'boerenworst', 'worst', 'burger', 'bavette', 'beef', 'ham', 'lamb', 'lam', 'kippendij', 'kipfilet'];
            const fishWords = ['vis', 'zalm', 'koolvis', 'garnaal', 'tonijn', 'fish', 'pangasius', 'kabeljauw', 'scampi', 'kreeft'];
            const dairyEggWords = ['kaas', 'cheese', 'mozzarella', 'feta', 'brie', 'pecorino', 'burrata', 'geitenkaas', 'halloumi', 'parmezan', 'parmezaan', 'ricotta', 'mascarpone', 'room', 'melk', 'milk', 'boter', 'butter', 'yoghurt', 'crème', 'creme', 'ei', 'eier', 'egg'];
            const hasMeat = meatWords.some((w) => allText.includes(w));
            const hasFish = fishWords.some((w) => allText.includes(w));
            const hasDairy = dairyEggWords.some((w) => {
              // Avoid false positives: "ei" in "eigenlijk", use word boundary check
              if (w === 'ei') return /\bei\b|\beier/.test(allText);
              if (w === 'room') return /\broom\b|slagroom|kokosroom/.test(allText);
              return allText.includes(w);
            });

            switch (cat) {
              case 'kip': return allText.includes('kip') || allText.includes('chicken');
              case 'vlees': return hasMeat;
              case 'vis': return hasFish;
              case 'vegetarisch': return !hasMeat && !hasFish;
              case 'veganistisch': return !hasMeat && !hasFish && !hasDairy;
              case 'pasta': return allText.includes('pasta') || allText.includes('conchiglie') || allText.includes('casarecce') || allText.includes('cannelloni') || allText.includes('spaghetti') || allText.includes('lasagne') || allText.includes('penne') || allText.includes('noedel');
              case 'salade': return allText.includes('salade') || allText.includes('salad');
              case 'soep': return allText.includes('soep') || allText.includes('soup');
              case 'dessert': return allText.includes('dessert') || allText.includes('taart') || allText.includes('cake') || allText.includes('tiramisu');
              default: return false;
            }
          });
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
