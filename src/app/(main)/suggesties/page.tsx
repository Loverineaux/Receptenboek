'use client';

import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, Soup } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import IngredientChips from '@/components/ui/IngredientChips';
import RecipeCard from '@/components/recipes/RecipeCard';
import dynamic from 'next/dynamic';

const AddToCollectionModal = dynamic(() => import('@/components/recipes/AddToCollectionModal'));
import { useCollectionRecipeIds } from '@/hooks/useCollectionRecipeIds';
import Button from '@/components/ui/Button';

interface SuggestionResult {
  recipe: any;
  matchCount: number;
  totalCount: number;
  matchPercentage: number;
  matched: string[];
  missing: string[];
}

export default function SuggestiesPage() {
  const { user } = useAuth();
  const collectionRecipeIds = useCollectionRecipeIds();
  const supabase = createClient();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [results, setResults] = useState<SuggestionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [initialUserRatings, setInitialUserRatings] = useState<Record<string, number>>({});
  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch('/api/suggesties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredienten: ingredients }),
      });

      if (res.ok) {
        const data = await res.json();

        // Check favorites and ratings in parallel
        if (user) {
          const [favsResult, ratingsResult] = await Promise.all([
            supabase.from('favorites').select('recipe_id').eq('user_id', user.id),
            supabase.from('ratings').select('recipe_id, sterren').eq('user_id', user.id),
          ]);

          const favIds = new Set((favsResult.data ?? []).map((f: any) => f.recipe_id));
          for (const item of data) {
            item.recipe.is_favorited = favIds.has(item.recipe.id);
          }

          if (ratingsResult.data) {
            const map: Record<string, number> = {};
            ratingsResult.data.forEach((r: any) => { map[r.recipe_id] = r.sterren; });
            setUserRatings(map);
            setInitialUserRatings(map);
          }
        }

        setResults(data);
      }
    } finally {
      setLoading(false);
    }
  }, [ingredients, user, supabase]);

  const handleFavoriteToggle = async (recipeId: string, isFavorited: boolean) => {
    if (!user) return;
    if (isFavorited) {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'POST' });
    } else {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'DELETE' });
    }
    setResults((prev) =>
      prev.map((r) =>
        r.recipe.id === recipeId ? { ...r, recipe: { ...r.recipe, is_favorited: isFavorited } } : r
      )
    );
  };

  const handleRate = async (recipeId: string, rating: number) => {
    if (!user) return;
    const newRating = rating === userRatings[recipeId] ? 0 : rating;

    if (newRating === 0) {
      setUserRatings((prev) => { const n = { ...prev }; delete n[recipeId]; return n; });
    } else {
      setUserRatings((prev) => ({ ...prev, [recipeId]: newRating }));
    }

    await fetch(`/api/recipes/${recipeId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sterren: newRating }),
    });
  };

  return (
    <div data-tour="suggesties-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <Soup className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-text-primary">Wat kan ik koken?</h1>
      </div>

      <p className="text-sm text-text-secondary">
        Voer de ingrediënten in die je in huis hebt. We zoeken recepten die je ermee kunt maken.
      </p>

      {/* Ingredient input */}
      <IngredientChips
        items={ingredients}
        onAdd={(item) => setIngredients((prev) => [...prev, item])}
        onRemove={(item) => setIngredients((prev) => prev.filter((i) => i !== item))}
      />

      {/* Search button */}
      <Button
        variant="primary"
        onClick={search}
        disabled={ingredients.length === 0 || loading}
      >
        {loading ? 'Zoeken...' : 'Zoek recepten'}
      </Button>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            {results.length} recept{results.length !== 1 ? 'en' : ''} gevonden
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((result) => (
              <SuggestionCard
                key={result.recipe.id}
                result={result}
                onFavoriteToggle={handleFavoriteToggle}
                onRate={user ? handleRate : undefined}
                userRating={userRatings[result.recipe.id]}
                initialUserRating={initialUserRatings[result.recipe.id] ?? 0}
                onAddToCollection={user ? (id: string) => setCollectionRecipeId(id) : undefined}
                isInCollection={collectionRecipeIds.has(result.recipe.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl">🤔</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            Geen recepten gevonden
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Probeer andere of meer ingrediënten toe te voegen.
          </p>
        </div>
      )}
      {collectionRecipeId && (
        <AddToCollectionModal
          recipeId={collectionRecipeId}
          open={!!collectionRecipeId}
          onClose={() => setCollectionRecipeId(null)}
        />
      )}
    </div>
  );
}

function SuggestionCard({
  result,
  onFavoriteToggle,
  onRate,
  userRating,
  initialUserRating,
  onAddToCollection,
  isInCollection,
}: {
  result: SuggestionResult;
  onFavoriteToggle: (id: string, fav: boolean) => void;
  onRate?: (id: string, rating: number) => void;
  userRating?: number;
  initialUserRating: number;
  onAddToCollection?: (id: string) => void;
  isInCollection: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      {/* Match indicator — clickable */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-gray-50"
      >
        <span className="font-medium text-primary">
          {result.matchCount} van {result.totalCount} ingrediënten in huis
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">
            {Math.round(result.matchPercentage * 100)}%
          </span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-text-muted" />}
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-2">
        <div className="h-1.5 w-full rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${result.matchPercentage * 100}%` }}
          />
        </div>
      </div>

      {/* Ingredient list popup */}
      {open && (
        <div className="mx-1 rounded-lg border bg-surface p-3 shadow-sm">
          <div className="flex flex-wrap gap-1.5">
            {(result.matched || []).map((ing, i) => (
              <span key={`m-${i}`} className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                {ing}
              </span>
            ))}
            {result.missing.map((ing, i) => (
              <span key={`x-${i}`} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                {ing}
              </span>
            ))}
          </div>
        </div>
      )}

      <RecipeCard
        recipe={result.recipe}
        onFavoriteToggle={onFavoriteToggle}
        onRate={onRate}
        userRating={userRating}
        initialUserRating={initialUserRating}
        onAddToCollection={onAddToCollection}
        isInCollection={isInCollection}
      />
    </div>
  );
}
