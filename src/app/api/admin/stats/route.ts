import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const [users, recipes, comments, collections, ingredients, products] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('recipes').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('collections').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('generic_ingredients').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
  ]);

  // Recent signups (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: recentSignups } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo);

  return NextResponse.json({
    users: users.count ?? 0,
    recipes: recipes.count ?? 0,
    comments: comments.count ?? 0,
    collections: collections.count ?? 0,
    ingredients: ingredients.count ?? 0,
    products: products.count ?? 0,
    recentSignups: recentSignups ?? 0,
  });
}
