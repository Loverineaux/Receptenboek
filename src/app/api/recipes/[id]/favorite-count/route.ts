import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Start count query immediately (no auth needed, uses admin client)
  const countPromise = supabaseAdmin
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', id);

  // Check if user is logged in via session cookie (instant, no network call)
  // Use getSession() instead of getUser() to avoid slow auth server round-trip
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const [{ count }, isFavorited] = await Promise.all([
    countPromise,
    session?.user
      ? supabaseAdmin
          .from('favorites')
          .select('recipe_id')
          .eq('recipe_id', id)
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => !!data)
      : Promise.resolve(false),
  ]);

  return NextResponse.json({ count: count ?? 0, is_favorited: isFavorited });
}
