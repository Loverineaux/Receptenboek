import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/ingredients/cleanup-duplicates
// 1. Removes duplicate products per ingredient (same product_name, keeping the one with most nutrition data)
// 2. Recalculates nutrition averages for ALL ingredients to fix stale/inconsistent data
export async function POST() {
  try {
    // Get ALL ingredients
    const { data: allIngredients, error: ingErr } = await supabaseAdmin
      .from('generic_ingredients')
      .select('id, name, avg_kcal, product_count');

    if (ingErr) {
      return NextResponse.json({ error: ingErr.message }, { status: 500 });
    }

    let totalRemoved = 0;
    let ingredientsAffected = 0;
    let nutritionFixed = 0;
    const deduped: { ingredient: string; removed: number; kept: number }[] = [];
    const fixed: { ingredient: string; oldCount: number; newCount: number }[] = [];

    for (const ing of allIngredients ?? []) {
      // Get all products linked to this ingredient
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('generic_ingredient_id', ing.id)
        .order('created_at', { ascending: true });

      const linkedCount = (products ?? []).filter((p: any) => p.kcal != null).length;

      // Step 1: Deduplicate if there are multiple products
      if (products && products.length > 1) {
        const groups = new Map<string, typeof products>();
        for (const p of products) {
          const key = `${(p.product_name || '').toLowerCase().trim()}|${(p.brand || '').toLowerCase().trim()}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(p);
        }

        const toRemove: string[] = [];
        for (const [, group] of groups) {
          if (group.length <= 1) continue;

          const scored = group.map(p => ({
            product: p,
            score: [p.kcal, p.protein, p.fat, p.saturated_fat, p.carbs, p.sugars, p.fiber, p.salt]
              .filter(v => v != null).length,
          }));
          scored.sort((a, b) => b.score - a.score);

          for (let i = 1; i < scored.length; i++) {
            toRemove.push(scored[i].product.id);
          }
        }

        if (toRemove.length > 0) {
          await supabaseAdmin
            .from('products')
            .update({ generic_ingredient_id: null })
            .in('id', toRemove);

          totalRemoved += toRemove.length;
          ingredientsAffected++;
          deduped.push({
            ingredient: ing.name,
            removed: toRemove.length,
            kept: products.length - toRemove.length,
          });
        }
      }

      // Step 2: Recalculate nutrition for this ingredient
      // This fixes ingredients where product_count doesn't match actual linked products,
      // or where avg values are stale
      await supabaseAdmin.rpc('recalculate_generic_nutrition', {
        ingredient_id: ing.id,
      });

      // Check if nutrition was inconsistent (had avg_kcal but wrong product_count)
      if (ing.avg_kcal != null && ing.product_count !== linkedCount) {
        nutritionFixed++;
        fixed.push({
          ingredient: ing.name,
          oldCount: ing.product_count,
          newCount: linkedCount,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalRemoved,
      ingredientsAffected,
      nutritionFixed,
      deduped,
      fixed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
