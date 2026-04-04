import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GenericIngredient } from '@/types/ingredients';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { barcode } = body;

    if (!barcode || typeof barcode !== 'string' || !barcode.trim()) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    // 1. Check own products table
    const { data: localProduct, error: localError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('barcode', barcode.trim())
      .maybeSingle();

    if (localError) {
      return NextResponse.json({ error: localError.message }, { status: 500 });
    }

    if (localProduct) {
      let linkedIngredient: GenericIngredient | null = null;

      if (localProduct.generic_ingredient_id) {
        const { data: ingredient } = await supabaseAdmin
          .from('generic_ingredients')
          .select('*')
          .eq('id', localProduct.generic_ingredient_id)
          .single();

        linkedIngredient = ingredient ?? null;
      }

      return NextResponse.json({
        product: localProduct,
        source: 'local',
        linked_ingredient: linkedIngredient,
      });
    }

    // 2. Not found locally — call Open Food Facts
    const offResponse = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode.trim())}.json`
    );
    const offData = await offResponse.json();

    if (offData.status === 1 && offData.product) {
      const off = offData.product;
      const n = off.nutriments || {};

      const productName =
        off.product_name_nl || off.product_name || 'Onbekend product';

      const productData = {
        barcode: barcode.trim(),
        brand: off.brands || null,
        product_name: productName,
        weight_grams: parseFloat(off.product_quantity) || null,
        kcal: n['energy-kcal_100g'] ?? null,
        protein: n['proteins_100g'] ?? null,
        fat: n['fat_100g'] ?? null,
        saturated_fat: n['saturated-fat_100g'] ?? null,
        carbs: n['carbohydrates_100g'] ?? null,
        sugars: n['sugars_100g'] ?? null,
        fiber: n['fiber_100g'] ?? null,
        salt: n['salt_100g'] ?? null,
        image_url: off.image_url || off.image_front_url || null,
        source: 'open_food_facts' as const,
      };

      // Save to products table
      const { data: savedProduct, error: insertError } = await supabaseAdmin
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }

      // Try to auto-match to a generic ingredient
      let suggestedIngredient: GenericIngredient | null = null;

      try {
        const { data: allIngredients } = await supabaseAdmin
          .from('generic_ingredients')
          .select('*');

        if (allIngredients && allIngredients.length > 0) {
          const normalized = productName
            .toLowerCase()
            .replace(off.brands ? new RegExp(off.brands.toLowerCase(), 'g') : '', '')
            .trim();
          const words = normalized.split(/\s+/).filter((w: string) => w.length > 2);

          let bestMatch: GenericIngredient | null = null;
          let bestScore = 0;

          for (const ingredient of allIngredients) {
            const ingredientName = ingredient.name.toLowerCase();
            const ingredientAliases: string[] = (ingredient.aliases || []).map(
              (a: string) => a.toLowerCase()
            );
            const allNames = [ingredientName, ...ingredientAliases];

            for (const name of allNames) {
              // Exact match on full name within product name
              if (normalized.includes(name) && name.length > 2) {
                const score = name.length;
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = ingredient;
                }
              }

              // Word-level matching
              for (const word of words) {
                if (name === word && word.length > 3) {
                  const score = word.length;
                  if (score > bestScore) {
                    bestScore = score;
                    bestMatch = ingredient;
                  }
                }
              }
            }
          }

          if (bestMatch && bestScore > 3) {
            suggestedIngredient = bestMatch;

            // Link the product to the matched ingredient
            await supabaseAdmin
              .from('products')
              .update({ generic_ingredient_id: bestMatch.id })
              .eq('id', savedProduct.id);

            savedProduct.generic_ingredient_id = bestMatch.id;
          }
        }
      } catch (matchError) {
        // Non-fatal: continue without suggestion
        console.error('[Scan] Auto-match error:', matchError);
      }

      return NextResponse.json({
        product: savedProduct,
        source: 'open_food_facts',
        suggested_ingredient: suggestedIngredient,
      });
    }

    // 4. Not found anywhere
    return NextResponse.json({
      product: null,
      source: 'not_found',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[Scan] Error:', message);
    return NextResponse.json(
      { error: `Barcode scan mislukt: ${message}` },
      { status: 500 }
    );
  }
}
