import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Fetch profile (bypasses RLS)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, avatar_url, bio, created_at, last_seen')
    .eq('id', params.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
  }

  // Fetch their recipes
  const { data: recipes } = await supabaseAdmin
    .from('recipes')
    .select('id, title, image_url, bron, tijd, created_at, user_id, ratings(sterren, user_id), tags:recipe_tags(tag:tags(id, name)), comments(id), ingredients(naam)')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false });

  // Stats
  const recipeCount = recipes?.length ?? 0;
  const allRatings = (recipes ?? []).flatMap((r: any) => r.ratings ?? []);
  const avgRating = allRatings.length > 0
    ? allRatings.reduce((s: number, r: any) => s + r.sterren, 0) / allRatings.length
    : null;
  const lastRecipeAt = recipes?.[0]?.created_at ?? null;

  return NextResponse.json({
    profile,
    recipes: recipes ?? [],
    stats: {
      recipe_count: recipeCount,
      avg_rating: avgRating,
      last_recipe_at: lastRecipeAt,
      last_seen: profile.last_seen,
      member_since: profile.created_at,
    },
  });
}
