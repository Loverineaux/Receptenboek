import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const fetcher = async (userId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from('favorites')
    .select('recipe_id')
    .eq('user_id', userId);
  return new Set((data ?? []).map((f: any) => f.recipe_id));
};

export function useFavorites() {
  const { user } = useAuth();

  const { data: favoriteIds, mutate } = useSWR(
    user ? `favorites-${user.id}` : null,
    () => fetcher(user!.id),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Don't re-fetch within 60s
    }
  );

  const toggleFavorite = async (recipeId: string, isFavorited: boolean) => {
    if (!user) return;

    // Optimistic update
    const newIds = new Set(favoriteIds);
    if (isFavorited) newIds.add(recipeId);
    else newIds.delete(recipeId);
    mutate(newIds, false);

    // Persist
    const res = await fetch(`/api/recipes/${recipeId}/favorite`, {
      method: isFavorited ? 'POST' : 'DELETE',
    });

    if (!res.ok) {
      // Rollback on failure
      mutate();
    }
  };

  return {
    favoriteIds: favoriteIds ?? new Set<string>(),
    toggleFavorite,
    mutateFavorites: mutate,
  };
}
