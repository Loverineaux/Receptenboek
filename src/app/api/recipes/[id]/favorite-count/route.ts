import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { count } = await supabaseAdmin
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', params.id);

  // Check if the current user has favorited this recipe
  let isFavorited = false;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: fav } = await supabaseAdmin
      .from('favorites')
      .select('recipe_id')
      .eq('recipe_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();
    isFavorited = !!fav;
  }

  return NextResponse.json({ count: count ?? 0, is_favorited: isFavorited });
}
