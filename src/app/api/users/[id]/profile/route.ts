import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getAuthWithAdmin } from '@/lib/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth vereist; bepaal of de kijker de eigenaar of een admin is.
  const auth = await getAuthWithAdmin(await createClient());
  if (!auth) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }
  const canSeePrivate = auth.userId === id || auth.isAdmin;

  // Fetch profile (bypasses RLS)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, avatar_url, bio, created_at, last_seen')
    .eq('id', id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
  }

  // Fetch their recipes — verberg privé-recepten voor andere gebruikers.
  let recipesQuery = supabaseAdmin
    .from('recipes')
    .select('id, title, image_url, bron, tijd, created_at, user_id, is_public, ratings(sterren, user_id), tags:recipe_tags(tag:tags(id, name)), comments(id), ingredients(naam)')
    .eq('user_id', id)
    .order('created_at', { ascending: false });
  if (!canSeePrivate) {
    recipesQuery = recipesQuery.eq('is_public', true);
  }
  const { data: recipes } = await recipesQuery;

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
