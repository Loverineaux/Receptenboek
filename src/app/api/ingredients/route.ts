import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/ingredients — list/search generic ingredients
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabaseAdmin
    .from('generic_ingredients')
    .select('*', { count: 'exact' });

  if (search) {
    // Search on name and aliases (ilike)
    query = query.or(`name.ilike.%${search}%,aliases.cs.{${search.toLowerCase()}}`);
  }

  if (category) {
    query = query.eq('category', category);
  }

  query = query.order('name', { ascending: true }).range(offset, offset + limit - 1);

  const { data: ingredients, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ingredients: ingredients ?? [], total: count ?? 0 });
}

// POST /api/ingredients — create new generic ingredient
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
