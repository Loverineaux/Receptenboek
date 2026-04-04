import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { generic_ingredient_id } = body;

    if (!generic_ingredient_id || typeof generic_ingredient_id !== 'string') {
      return NextResponse.json(
        { error: 'generic_ingredient_id is required' },
        { status: 400 }
      );
    }

    // 1. Update product's generic_ingredient_id
    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update({ generic_ingredient_id })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // 2. Recalculate generic nutrition averages
    const { error: rpcError } = await supabaseAdmin.rpc(
      'recalculate_generic_nutrition',
      { ingredient_id: generic_ingredient_id }
    );

    if (rpcError) {
      console.error('[Link] RPC error:', rpcError.message);
      // Non-fatal: product is already linked, just log the error
    }

    // 3. Return the updated product
    return NextResponse.json({ product: updatedProduct });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[Link] Error:', message);
    return NextResponse.json(
      { error: `Product koppelen mislukt: ${message}` },
      { status: 500 }
    );
  }
}
