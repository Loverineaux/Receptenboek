import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Lightweight recipes-card endpoint for the /recepten list view.
 *
 * Why not call Supabase directly from the browser (as the page used to)?
 *    The server-side Supabase connection pool is kept warm by the /api/ping
 *    cron, so this route responds in ~300-500ms even on a cold user open.
 *    A fresh browser→Supabase call is cold and routinely takes 3-4s.
 *
 * Accepts the same filter set as the client-side fetchRecipes:
 *   - search        title + subtitle multi-word ilike
 *   - category      tag name (resolves to recipe ids via recipe_tags)
 *   - source        exact bron match
 *   - included      comma-separated bron list (OR)
 *   - excluded      comma-separated bron list (NOT IN)
 *   - ids           comma-separated recipe ids (pre-filter — used by
 *                   ingredient search on the client)
 *   - sort          newest|rating|time|az|za
 *   - offset,limit  pagination
 *
 * Returns the card-view shape the RecipeCard component expects plus the
 * approximate total count.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;

  const search = (sp.get('search') || '').trim();
  const category = (sp.get('category') || '').trim();
  const source = (sp.get('source') || '').trim();
  const included = (sp.get('included') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const excluded = (sp.get('excluded') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const idsParam = (sp.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const sort = sp.get('sort') || 'newest';
  const offset = parseInt(sp.get('offset') || '0', 10);
  const limit = Math.min(parseInt(sp.get('limit') || '24', 10), 100);

  // Resolve category → recipe ids
  let filteredIds: string[] | null = null;
  if (category) {
    const { data: tagMatches, error: tagErr } = await supabase
      .from('recipe_tags')
      .select('recipe_id, tag:tags!inner(name)')
      .ilike('tags.name', category);
    if (tagErr) return NextResponse.json({ error: tagErr.message }, { status: 500 });
    const catIds = (tagMatches ?? []).map((t: { recipe_id: string }) => t.recipe_id);
    if (catIds.length === 0) {
      return NextResponse.json({ recipes: [], total: 0 });
    }
    filteredIds = catIds;
  }

  if (idsParam.length > 0) {
    filteredIds = filteredIds ? filteredIds.filter((id) => idsParam.includes(id)) : idsParam;
    if (filteredIds.length === 0) {
      return NextResponse.json({ recipes: [], total: 0 });
    }
  }

  let query = supabase.from('recipes').select(
    `
      id, title, subtitle, image_url, bron, tijd, created_at,
      tags:recipe_tags(tag:tags(id, name))
    `,
    { count: 'planned' },
  );

  if (filteredIds) {
    query = query.in('id', filteredIds);
  }

  if (search) {
    const words = search.split(/\s+/).filter(Boolean);
    for (const word of words) {
      query = query.or(`title.ilike.%${word}%,subtitle.ilike.%${word}%`);
    }
  }

  if (source) {
    query = query.eq('bron', source);
  } else if (included.length > 0) {
    query = query.in('bron', included);
  }
  if (excluded.length > 0) {
    query = query.not('bron', 'in', `(${excluded.join(',')})`);
  }

  switch (sort) {
    case 'time':
      query = query.order('tijd', { ascending: true, nullsFirst: false });
      break;
    case 'az':
      query = query.order('title', { ascending: true });
      break;
    case 'za':
      query = query.order('title', { ascending: false });
      break;
    case 'rating':
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten tags to match the client's old post-processing
  const recipes = (data ?? []).map((r: Record<string, unknown>) => {
    const rawTags = (r.tags as Array<{ tag: unknown }> | undefined) ?? [];
    const flatTags = rawTags.map((rt) => rt.tag).filter(Boolean);
    return { ...r, tags: flatTags };
  });

  return NextResponse.json({ recipes, total: count ?? 0 });
}
