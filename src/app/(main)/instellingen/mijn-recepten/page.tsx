'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import RecipeCard from '@/components/recipes/RecipeCard';
import type { RecipeWithRelations } from '@/types';
import BackButton from '@/components/ui/BackButton';
import ScreenHeader from '@/components/ui/ScreenHeader';

export default function MijnReceptenPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMyRecipes = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch count and recipes in parallel
    const [countResult, recipesResult] = await Promise.all([
      supabase.from('recipes').select('*', { count: 'exact', head: true }),
      supabase
        .from('recipes')
        .select(`
          *,
          ingredients(naam),
          tags:recipe_tags(tag:tags(id, name)),
          ratings(sterren, user_id),
          comments(id),
          user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    setTotalCount(countResult.count ?? 0);
    const { data } = recipesResult;

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
      };
    });

    setRecipes(processed);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) fetchMyRecipes();
  }, [user, authLoading, fetchMyRecipes, router]);

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="pt-1">
        <BackButton href="/instellingen" label="Terug naar instellingen" />
      </div>

      <ScreenHeader
        title="Mijn recepten"
        subtitle={!loading ? `${recipes.length} van jou — ${totalCount} totaal in de bibliotheek` : undefined}
        profileButton={false}
        className="mb-6"
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : recipes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl">📝</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            Nog geen eigen recepten
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Je hebt nog geen recepten toegevoegd aan de bibliotheek.
          </p>
        </div>
      )}
    </div>
  );
}
