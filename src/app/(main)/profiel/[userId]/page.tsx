'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { RecipeWithRelations, UserProfile } from '@/types';

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, created_at, updated_at')
      .eq('id', params.userId)
      .single();

    if (profileData) {
      setProfile(profileData as UserProfile);
    }

    // Fetch their public recipes
    const { data: recipesData } = await supabase
      .from('recipes')
      .select(
        `
        *,
        ingredients(*),
        steps(*),
        tags:recipe_tags(tag:tags(*)),
        nutrition(*),
        ratings(*)
      `
      )
      .eq('user_id', params.userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    const processed: RecipeWithRelations[] = (recipesData ?? []).map(
      (r: any) => {
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
          nutrition: Array.isArray(r.nutrition)
            ? r.nutrition[0] ?? null
            : r.nutrition,
          comments: [],
          user: profileData,
        };
      }
    );

    // Check favorites
    if (currentUser) {
      const { data: favs } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', currentUser.id);

      const favIds = new Set((favs ?? []).map((f: any) => f.recipe_id));
      const withFavs = processed.map((r) => ({
        ...r,
        is_favorited: favIds.has(r.id),
      }));
      setRecipes(withFavs);
    } else {
      setRecipes(processed);
    }

    setLoading(false);
  }, [supabase, params.userId, currentUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFavoriteToggle = async (recipeId: string, isFavorited: boolean) => {
    if (!currentUser) return;

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold text-text-primary">
          Gebruiker niet gevonden
        </h2>
      </div>
    );
  }

  // Compute average rating the user has given
  const allRatings = recipes.flatMap((r) => r.ratings);
  const userGivenRatings = allRatings.filter(
    (rt) => rt.user_id === params.userId
  );
  const avgGiven =
    userGivenRatings.length > 0
      ? userGivenRatings.reduce((s, r) => s + r.sterren, 0) /
        userGivenRatings.length
      : null;

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-100">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? ''}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-8 w-8 text-text-muted" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {profile.display_name ?? 'Anoniem'}
          </h1>
          <p className="text-sm text-text-secondary">
            {recipes.length} openbare recept{recipes.length !== 1 ? 'en' : ''}
          </p>
          {avgGiven !== null && (
            <p className="text-sm text-text-secondary">
              Gemiddeld gegeven beoordeling: {avgGiven.toFixed(1)} / 5
            </p>
          )}
        </div>
      </div>

      {/* Recipes grid */}
      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl">📭</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            Geen openbare recepten
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Deze gebruiker heeft nog geen openbare recepten gedeeld.
          </p>
        </div>
      )}
    </div>
  );
}
