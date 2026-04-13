import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const { recipe_ids } = await request.json();

  if (!Array.isArray(recipe_ids) || recipe_ids.length === 0) {
    return NextResponse.json({});
  }

  // Fetch ratings, comments, and favorites in parallel (server-side, bypasses RLS)
  const [ratingsResult, commentsResult, favoritesResult] = await Promise.all([
    supabaseAdmin.from('ratings').select('recipe_id, sterren').in('recipe_id', recipe_ids),
    supabaseAdmin.from('comments').select('recipe_id').in('recipe_id', recipe_ids),
    supabaseAdmin.from('favorites').select('recipe_id').in('recipe_id', recipe_ids),
  ]);

  // Initialize all requested IDs
  const result: Record<string, { avg_rating: number | null; rating_count: number; comment_count: number; favorite_count: number }> = {};
  for (const id of recipe_ids) {
    result[id] = { avg_rating: null, rating_count: 0, comment_count: 0, favorite_count: 0 };
  }

  // Compute rating averages
  const ratingSums: Record<string, number> = {};
  for (const r of ratingsResult.data ?? []) {
    if (!result[r.recipe_id]) continue;
    result[r.recipe_id].rating_count++;
    ratingSums[r.recipe_id] = (ratingSums[r.recipe_id] ?? 0) + r.sterren;
  }
  for (const id of Object.keys(ratingSums)) {
    result[id].avg_rating = ratingSums[id] / result[id].rating_count;
  }

  // Count comments
  for (const c of commentsResult.data ?? []) {
    if (result[c.recipe_id]) result[c.recipe_id].comment_count++;
  }

  // Count favorites
  for (const f of favoritesResult.data ?? []) {
    if (result[f.recipe_id]) result[f.recipe_id].favorite_count++;
  }

  return NextResponse.json(result);
}
