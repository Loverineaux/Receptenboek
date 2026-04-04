import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_name, brand, barcode, image_url, kcal, protein, fat, saturated_fat, carbs, sugars, fiber, salt, source } = body;

    if (!product_name || !barcode) {
      return NextResponse.json({ error: 'product_name en barcode zijn verplicht' }, { status: 400 });
    }

    // Check if barcode already exists
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('barcode', barcode.trim())
      .maybeSingle();

    if (existing) {
      // Update existing product with new nutrition data
      const updates: Record<string, any> = {};
      if (kcal != null) updates.kcal = kcal;
      if (protein != null) updates.protein = protein;
      if (fat != null) updates.fat = fat;
      if (saturated_fat != null) updates.saturated_fat = saturated_fat;
      if (carbs != null) updates.carbs = carbs;
      if (sugars != null) updates.sugars = sugars;
      if (fiber != null) updates.fiber = fiber;
      if (salt != null) updates.salt = salt;
      if (product_name) updates.product_name = product_name;
      if (brand) updates.brand = brand;

      if (Object.keys(updates).length > 0) {
        const { data: updated, error } = await supabaseAdmin
          .from('products')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Recalculate if linked
        if (existing.generic_ingredient_id) {
          await supabaseAdmin.rpc('recalculate_generic_nutrition', { ingredient_id: existing.generic_ingredient_id });
        }

        return NextResponse.json(updated, { status: 200 });
      }

      return NextResponse.json(existing, { status: 200 });
    }

    // Create new product
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        product_name: product_name.trim(),
        brand: brand || null,
        barcode: barcode.trim(),
        image_url: image_url || null,
        kcal: kcal ?? null,
        protein: protein ?? null,
        fat: fat ?? null,
        saturated_fat: saturated_fat ?? null,
        carbs: carbs ?? null,
        sugars: sugars ?? null,
        fiber: fiber ?? null,
        salt: salt ?? null,
        source: source || 'user_scan',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(product, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Onbekende fout' }, { status: 500 });
  }
}
