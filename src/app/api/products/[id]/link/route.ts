import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { generic_ingredient_id } = body;

    if (!generic_ingredient_id || typeof generic_ingredient_id !== 'string') {
      return NextResponse.json({ error: 'generic_ingredient_id is required' }, { status: 400 });
    }

    // Get current product (for ownership check + old ingredient recalc)
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('scanned_by, generic_ingredient_id')
      .eq('id', id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 });
    }

    // Ownership check: only scanner or admin
    const admin = await isAdmin(supabase);
    if (!admin && product.scanned_by !== user.id) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
    }

    const oldIngredientId = product.generic_ingredient_id;

    // 1. Update product's generic_ingredient_id
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update({ generic_ingredient_id })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Recalculate nutrition for NEW ingredient
    const { error: rpcErrNew } = await supabaseAdmin.rpc('recalculate_generic_nutrition', {
      ingredient_id: generic_ingredient_id,
    });
    if (rpcErrNew) console.error('[Link] RPC error (new):', rpcErrNew.message);

    // 3. Recalculate nutrition for OLD ingredient (if it was linked before)
    if (oldIngredientId && oldIngredientId !== generic_ingredient_id) {
      const { error: rpcErrOld } = await supabaseAdmin.rpc('recalculate_generic_nutrition', {
        ingredient_id: oldIngredientId,
      });
      if (rpcErrOld) console.error('[Link] RPC error (old):', rpcErrOld.message);

      // Update product count on old ingredient
      const { count: oldCount } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('generic_ingredient_id', oldIngredientId);

      await supabaseAdmin
        .from('generic_ingredients')
        .update({ product_count: oldCount ?? 0 })
        .eq('id', oldIngredientId);
    }

    // 4. Update product count on new ingredient
    const { count: newCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('generic_ingredient_id', generic_ingredient_id);

    await supabaseAdmin
      .from('generic_ingredients')
      .update({ product_count: newCount ?? 0 })
      .eq('id', generic_ingredient_id);

    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Link] Error:', message);
    return NextResponse.json({ error: `Product koppelen mislukt: ${message}` }, { status: 500 });
  }
}
