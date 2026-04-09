import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/admin';

// DELETE /api/products/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // Get product info (for ownership check and nutrition recalc)
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, scanned_by, generic_ingredient_id')
    .eq('id', params.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: 'Product niet gevonden' }, { status: 404 });
  }

  // Ownership check: only scanner or admin
  const admin = await isAdmin(supabase);
  if (!admin && product.scanned_by !== user.id) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const ingredientId = product.generic_ingredient_id;

  // Delete the product
  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recalculate nutrition for the ingredient if it was linked
  if (ingredientId) {
    await supabaseAdmin.rpc('recalculate_generic_nutrition', {
      p_ingredient_id: ingredientId,
    });

    // Update product count
    const { count } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('generic_ingredient_id', ingredientId);

    await supabaseAdmin
      .from('generic_ingredients')
      .update({ product_count: count ?? 0 })
      .eq('id', ingredientId);
  }

  return NextResponse.json({ success: true });
}
