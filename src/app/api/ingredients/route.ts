import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/ingredients — list/search generic ingredients
// Query: search, category (komma-gescheiden voor meerdere), offset, limit,
// season_month (1–12: alleen seizoensingrediënten, dus niet jaarrond)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const parsedMonth = parseInt(searchParams.get('season_month') || '', 10);
  const seasonMonth = parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : null;

  let query = supabaseAdmin
    .from('generic_ingredients')
    .select('*', { count: 'exact' });

  if (search) {
    // Search on name and aliases (ilike)
    query = query.or(`name.ilike.%${search}%,aliases.cs.{${search.toLowerCase()}}`);
  }

  if (category) {
    const cats = category.split(',').map((c) => c.trim()).filter(Boolean);
    if (cats.length > 1) query = query.in('category', cats);
    else if (cats.length === 1) query = query.eq('category', cats[0]);
  }

  if (seasonMonth) {
    query = query.contains('season_months', [seasonMonth]);
  }

  query = query.order('name', { ascending: true });
  // Bij het seizoensfilter halen we alles op en filteren jaarrond (12 maanden) hieronder weg.
  query = seasonMonth ? query.limit(500) : query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let ingredients = data ?? [];
  if (seasonMonth) {
    ingredients = ingredients
      .filter((i) => !Array.isArray(i.season_months) || new Set(i.season_months).size < 12)
      .slice(offset, offset + limit);
  }

  // Receptaantallen (zichtbaarheid volgt de RLS van de ingelogde gebruiker)
  const recipeCounts: Record<string, number> = {};
  const ids = ingredients.map((i) => i.id);
  if (ids.length > 0) {
    const supabase = await createClient();
    const perIngredient = new Map<string, Set<string>>();
    const PAGE = 1000;
    for (let page = 0; page < 10; page++) {
      const { data: rows } = await supabase
        .from('ingredients')
        .select('generic_ingredient_id, recipe_id')
        .in('generic_ingredient_id', ids)
        .order('id')
        .range(page * PAGE, page * PAGE + PAGE - 1);
      for (const r of rows ?? []) {
        const set = perIngredient.get(r.generic_ingredient_id) ?? new Set<string>();
        set.add(r.recipe_id);
        perIngredient.set(r.generic_ingredient_id, set);
      }
      if (!rows || rows.length < PAGE) break;
    }
    perIngredient.forEach((set, key) => {
      recipeCounts[key] = set.size;
    });
  }

  return NextResponse.json({
    ingredients: ingredients.map((i) => ({ ...i, recipe_count: recipeCounts[i.id] ?? 0 })),
    total: seasonMonth ? ingredients.length : count ?? 0,
  });
}

// POST /api/ingredients — create new generic ingredient
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, name_plural, category, aliases, gram_per_piece, gram_per_ml, gram_per_el, gram_per_tl } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Check for duplicate name (case-insensitive)
  const { data: existing } = await supabaseAdmin
    .from('generic_ingredients')
    .select('id')
    .ilike('name', name.trim())
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'An ingredient with this name already exists' }, { status: 409 });
  }

  const insertData: Record<string, unknown> = { name: name.trim(), created_by: user.id };
  if (name_plural !== undefined) insertData.name_plural = name_plural;
  if (category !== undefined) insertData.category = category;
  if (aliases !== undefined) insertData.aliases = aliases;
  if (gram_per_piece !== undefined) insertData.gram_per_piece = gram_per_piece;
  if (gram_per_ml !== undefined) insertData.gram_per_ml = gram_per_ml;
  if (gram_per_el !== undefined) insertData.gram_per_el = gram_per_el;
  if (gram_per_tl !== undefined) insertData.gram_per_tl = gram_per_tl;

  const { data: created, error } = await supabaseAdmin
    .from('generic_ingredients')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
