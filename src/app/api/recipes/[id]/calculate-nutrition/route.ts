import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { matchIngredient, convertToGrams } from '@/lib/ingredients/matcher';
import type { NutritionCalculation } from '@/types';

// ────────────────────────────────────────────
// POST /api/recipes/[id]/calculate-nutrition
// ────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const save = body.save === true;

  // 1. Fetch recipe with ingredients
  const { data: recipe, error: recipeError } = await supabaseAdmin
    .from('recipes')
    .select('*, ingredients(*)')
    .eq('id', id)
    .single();

  if (recipeError || !recipe) {
    return NextResponse.json(
      { error: recipeError?.message ?? 'Recipe not found' },
      { status: 404 }
    );
  }

  // 2. Fetch unit conversions
  const { data: unitConversions } = await supabaseAdmin
    .from('unit_conversions')
    .select('*');

  // 3. Fetch all generic_ingredients (for matching fallback)
  const ingredients: any[] = recipe.ingredients ?? [];
  const porties = recipe.basis_porties || 1;

  // Nutrition accumulators
  let totalKcal = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalSaturatedFat = 0;
  let totalCarbs = 0;
  let totalSugars = 0;
  let totalFiber = 0;
  let totalSalt = 0;

  let matchedCount = 0;
  const matched: string[] = [];
  const missing: string[] = [];

  // 4. Process each ingredient
  for (const ing of ingredients) {
    let genericId: string | null = ing.generic_ingredient_id ?? null;

    // 4b. If not linked, try to match
    if (!genericId) {
      genericId = await matchIngredient(ing.naam, supabaseAdmin);

      // Save the link for future use
      if (genericId) {
        await supabaseAdmin
          .from('ingredients')
          .update({ generic_ingredient_id: genericId })
          .eq('id', ing.id);
      }
    }

    // 4c. If matched, calculate nutrition
    if (genericId) {
      const { data: gi } = await supabaseAdmin
        .from('generic_ingredients')
        .select('*')
        .eq('id', genericId)
        .single();

      if (gi && gi.avg_kcal != null) {
        const grams = convertToGrams(
          ing.hoeveelheid,
          ing.eenheid,
          {
            gram_per_piece: gi.gram_per_piece,
            gram_per_ml: gi.gram_per_ml,
            gram_per_el: gi.gram_per_el,
            gram_per_tl: gi.gram_per_tl,
          },
          unitConversions ?? []
        );

        if (grams != null && grams > 0) {
          // Nutrition values in DB are per 100g
          const factor = grams / 100;
          totalKcal += (gi.avg_kcal ?? 0) * factor;
          totalProtein += (gi.avg_protein ?? 0) * factor;
          totalFat += (gi.avg_fat ?? 0) * factor;
          totalSaturatedFat += (gi.avg_saturated_fat ?? 0) * factor;
          totalCarbs += (gi.avg_carbs ?? 0) * factor;
          totalSugars += (gi.avg_sugars ?? 0) * factor;
          totalFiber += (gi.avg_fiber ?? 0) * factor;
          totalSalt += (gi.avg_salt ?? 0) * factor;
          matchedCount++;
          matched.push(ing.naam);
        } else {
          // Matched but could not convert to grams
          missing.push(ing.naam);
        }
      } else {
        missing.push(ing.naam);
      }
    } else {
      // 4d. Not matched
      missing.push(ing.naam);
    }
  }

  // 5. Per-portion values
  const totalCount = ingredients.length;

  const result: NutritionCalculation = {
    total_kcal: Math.round(totalKcal),
    total_protein: Math.round(totalProtein * 10) / 10,
    total_fat: Math.round(totalFat * 10) / 10,
    total_saturated_fat: Math.round(totalSaturatedFat * 10) / 10,
    total_carbs: Math.round(totalCarbs * 10) / 10,
    total_sugars: Math.round(totalSugars * 10) / 10,
    total_fiber: Math.round(totalFiber * 10) / 10,
    total_salt: Math.round(totalSalt * 10) / 10,
    per_portion_kcal: Math.round(totalKcal / porties),
    per_portion_protein: Math.round((totalProtein / porties) * 10) / 10,
    per_portion_fat: Math.round((totalFat / porties) * 10) / 10,
    per_portion_saturated_fat:
      Math.round((totalSaturatedFat / porties) * 10) / 10,
    per_portion_carbs: Math.round((totalCarbs / porties) * 10) / 10,
    per_portion_sugars: Math.round((totalSugars / porties) * 10) / 10,
    per_portion_fiber: Math.round((totalFiber / porties) * 10) / 10,
    per_portion_salt: Math.round((totalSalt / porties) * 10) / 10,
    coverage: totalCount > 0 ? matchedCount / totalCount : 0,
    matched_count: matchedCount,
    total_count: totalCount,
    matched,
    missing,
  };

  // 6. Coverage threshold
  // 7. Save if requested and coverage is sufficient
  if (save && result.coverage > 0.5) {
    await supabaseAdmin.from('nutrition').upsert(
      {
        recipe_id: id,
        kcal: String(result.per_portion_kcal),
        eiwitten: String(result.per_portion_protein),
        vetten: String(result.per_portion_fat),
        verzadigd_vet: String(result.per_portion_saturated_fat),
        koolhydraten: String(result.per_portion_carbs),
        suikers: String(result.per_portion_sugars),
        vezels: String(result.per_portion_fiber),
        zout: String(result.per_portion_salt),
      },
      { onConflict: 'recipe_id' }
    );
  }

  // 8. Return the calculation result
  return NextResponse.json(result);
}
