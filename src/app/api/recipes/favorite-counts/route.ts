import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/recipes/favorite-counts — bulk get favorite counts
export async function POST(request: NextRequest) {
  const { recipe_ids } = await request.json();

  if (!Array.isArray(recipe_ids) || recipe_ids.length === 0) {
    return NextResponse.json({ counts: {} });
  }

  const { data } = await supabaseAdmin
    .from('favorites')
    .select('recipe_id')
    .in('recipe_id', recipe_ids);

  const counts: Record<string, number> = {};
  for (const f of data ?? []) {
    counts[f.recipe_id] = (counts[f.recipe_id] || 0) + 1;
  }

  return NextResponse.json({ counts });
}
