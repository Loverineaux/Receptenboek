import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { data, error: queryError } = await supabaseAdmin
    .from('comments')
    .select('id, tekst, created_at, recipe_id, user_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  // Fetch user profiles and recipe titles separately
  const userIds = [...new Set((data ?? []).map((c: any) => c.user_id))];
  const recipeIds = [...new Set((data ?? []).map((c: any) => c.recipe_id))];

  const [{ data: profiles }, { data: recipes }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, display_name, avatar_url').in('id', userIds),
    supabaseAdmin.from('recipes').select('id, title').in('id', recipeIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const recipeMap = new Map((recipes ?? []).map((r: any) => [r.id, r]));

  const comments = (data ?? []).map((c: any) => ({
    id: c.id,
    body: c.tekst,
    created_at: c.created_at,
    recipe_id: c.recipe_id,
    user: profileMap.get(c.user_id) || null,
    recipe_title: recipeMap.get(c.recipe_id)?.title || 'Onbekend recept',
  }));

  return NextResponse.json(comments);
}
