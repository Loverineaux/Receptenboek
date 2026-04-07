'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { RecipeWithRelations } from '@/types';

export default function NieuwsteReceptenPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewest = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('recipes')
        .select(
          `
          id, title, subtitle, image_url, bron, tijd, moeilijkheid, created_at,
          tags:recipe_tags(tag:tags(id, name)),
          ratings(sterren),
          comments(id),
          user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
        `
        )
        .order('created_at', { ascending: false })
        .limit(5);

      const processed: RecipeWithRelations[] = (data ?? []).map((r: any) => {
        const ratings = r.ratings ?? [];
        const avg =
          ratings.length > 0
            ? ratings.reduce((s: number, rt: any) => s + rt.sterren, 0) /
              ratings.length
            : null;

        return {
          ...r,
          tags: (r.tags ?? []).map((rt: any) => rt.tag).filter(Boolean),
          average_rating: avg,
          nutrition: null,
          ingredients: [],
          steps: [],
          comments: [],
        };
      });

      // Check favorites
      if (user) {
        const { data: favs } = await supabase
          .from('favorites')
          .select('recipe_id')
          .eq('user_id', user.id);

        const favIds = new Set((favs ?? []).map((f: any) => f.recipe_id));
        setRecipes(
          processed.map((r) => ({
            ...r,
            is_favorited: favIds.has(r.id),
          }))
        );
      } else {
        setRecipes(processed);
      }

      setLoading(false);
    };

    fetchNewest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFavoriteToggle = async (recipeId: string, isFavorited: boolean) => {
    if (!user) return;

    if (isFavorited) {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'POST' });
    } else {
      await fetch(`/api/recipes/${recipeId}/favorite`, { method: 'DELETE' });
    }

    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId ? { ...r, is_favorited: isFavorited } : r
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-text-primary">Nieuwste recepten</h1>
      </div>
      <p className="text-sm text-text-secondary">
        De 5 meest recent toegevoegde recepten.
      </p>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>
      )}

      {!loading && recipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl">🍽️</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            Nog geen recepten
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Er zijn nog geen recepten toegevoegd.
          </p>
        </div>
      )}
    </div>
  );
}
