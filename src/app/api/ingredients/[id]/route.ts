import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Direct Supabase REST call — bypasses any client-side caching
async function supabaseRest(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  return res.json();
}

async function supabaseRestMutate(path: string, method: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return res.json();
}

// GET /api/ingredients/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ingredients = await supabaseRest(
    `generic_ingredients?id=eq.${id}&select=*&limit=1`
  );

  if (!ingredients?.length) {
    return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
  }

  const ingredient = ingredients[0];

  const products = await supabaseRest(
    `products?generic_ingredient_id=eq.${id}&select=*`
  );

  const recipeRows = await supabaseRest(
    `ingredients?generic_ingredient_id=eq.${id}&select=recipe_id`
  );

  const distinctRecipeIds = new Set((recipeRows ?? []).map((r: any) => r.recipe_id));

  return NextResponse.json({
    ...ingredient,
    products: products ?? [],
    recipe_count: distinctRecipeIds.size,
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

// PUT /api/ingredients/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Ownership check: only creator or admin can edit
  const admin = await isAdmin(supabase);
  if (!admin) {
    const { data: ingredient } = await supabaseAdmin
      .from('generic_ingredients')
      .select('created_by')
      .eq('id', id)
      .single();

    // Seed ingredients (created_by = null) can only be edited by admin
    if (!ingredient || (ingredient.created_by !== null && ingredient.created_by !== user.id)) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
    }
    if (ingredient.created_by === null) {
      return NextResponse.json({ error: 'Alleen een beheerder kan dit ingrediënt bewerken' }, { status: 403 });
    }
  }

  const body = await request.json();

  const allowedFields = [
    'name', 'name_plural', 'category', 'aliases',
    'gram_per_piece', 'gram_per_ml', 'gram_per_el', 'gram_per_tl',
    'image_url',
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

  const updated = await supabaseRestMutate(
    `generic_ingredients?id=eq.${id}`,
    'PATCH',
    updateData
  );

  if (!updated?.length) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json(updated[0], {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
