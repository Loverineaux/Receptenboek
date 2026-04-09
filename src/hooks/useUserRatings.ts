import { useRef } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const fetcher = async (userId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from('ratings')
    .select('recipe_id, sterren')
    .eq('user_id', userId);
  const map: Record<string, number> = {};
  (data ?? []).forEach((r: any) => { map[r.recipe_id] = r.sterren; });
  return map;
};

export function useUserRatings() {
  const { user } = useAuth();
  // Track the DB-confirmed ratings separately from optimistic updates
  const confirmedRatings = useRef<Record<string, number>>({});

  const { data: ratings, mutate } = useSWR(
    user ? `user-ratings-${user.id}` : null,
    () => fetcher(user!.id),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      onSuccess: (data) => {
        // When data comes from the server, update confirmed ratings
        confirmedRatings.current = { ...data };
      },
    }
  );

  const rate = async (recipeId: string, sterren: number) => {
    if (!user) return;

    // Optimistic update (only the current view, not confirmed)
    const newRatings = { ...(ratings ?? {}) };
    if (sterren === 0) delete newRatings[recipeId];
    else newRatings[recipeId] = sterren;
    mutate(newRatings, false);

    // Persist
    await fetch(`/api/recipes/${recipeId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sterren }),
    });

    // After persist, update confirmed ratings
    if (sterren === 0) delete confirmedRatings.current[recipeId];
    else confirmedRatings.current[recipeId] = sterren;
  };

  return {
    userRatings: ratings ?? {},
    /** Ratings as confirmed by the DB — used as initialUserRating for live avg calculation */
    confirmedRatings: confirmedRatings.current,
    rate,
    mutateRatings: mutate,
  };
}
