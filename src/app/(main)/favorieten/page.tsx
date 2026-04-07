'use client';

import { useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RecipeCard from '@/components/recipes/RecipeCard';
import AddToCollectionModal from '@/components/recipes/AddToCollectionModal';
import { useCollectionRecipeIds } from '@/hooks/useCollectionRecipeIds';
import type { RecipeWithRelations } from '@/types';

export default function FavorietenPage() {
  const { user } = useAuth();
  const collectionRecipeIds = useCollectionRecipeIds();
  const supabase = createClient();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionRecipeId, setCollectionRecipeId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get favorite recipe IDs
    const { data: favs } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', user.id);

    const favIds = (favs ?? []).map((f: any) => f.recipe_id);

    if (favIds.length === 0) {
      setRecipes([]);
      setLoading(false);
      return;
    }

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

    const processed: RecipeWithRelations[] = (data ?? []).map((r: any) => {
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

    setRecipes(processed);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    fetchFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFavoriteToggle = async (recipeId: string, isFavorited: boolean) => {
    if (!user) return;

    if (isFavorited) {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'POST' });
    } else {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'DELETE' });
      // Remove from list immediately
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Favorieten</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Favorieten</h1>

      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onFavoriteToggle={handleFavoriteToggle}
              onAddToCollection={(id) => setCollectionRecipeId(id)}
              isInCollection={collectionRecipeIds.has(recipe.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart className="h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            Nog geen favorieten
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Klik op het hartje bij een recept om het als favoriet op te slaan.
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
