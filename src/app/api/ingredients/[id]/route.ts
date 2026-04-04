import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/ingredients/[id] — single ingredient with products and recipe count
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Fetch the generic ingredient
  const { data: ingredient, error: ingredientError } = await supabaseAdmin
    .from('generic_ingredients')
    .select('*')
    .eq('id', id)
    .single();

  if (ingredientError || !ingredient) {
    return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
  }

  // Fetch products linked to this generic ingredient
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('generic_ingredient_id', id);

  // Count distinct recipes that use this generic ingredient
  const { data: recipeRows } = await supabaseAdmin
    .from('ingredients')
    .select('recipe_id')
    .eq('generic_ingredient_id', id);

  const distinctRecipeIds = new Set((recipeRows ?? []).map((r: any) => r.recipe_id));
  const recipe_count = distinctRecipeIds.size;

  return NextResponse.json({
    ...ingredient,
    products: products ?? [],
    recipe_count,
  });
}

// PUT /api/ingredients/[id] — update ingredient
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await request.json();

  // Only allow known fields
  const allowedFields = [
    'name', 'name_plural', 'category', 'aliases',
    'gram_per_piece', 'gram_per_ml', 'gram_per_el', 'gram_per_tl',
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('generic_ingredients')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
