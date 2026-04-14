import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  // Fetch all recipes without temperature that have steps
  // Fetch recipes missing either temperature field
  const { data: recipes, error } = await supabaseAdmin
    .from('recipes')
    .select('id, title, temperatuur, kerntemperatuur, steps(beschrijving)')
    .or('temperatuur.is.null,kerntemperatuur.is.null');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ updated: 0, total: 0, message: 'Geen recepten zonder temperatuur gevonden' });
  }

  let updated = 0;
  const results: Array<{ id: string; title: string; temperatuur: string | null; kerntemperatuur: string | null }> = [];
  const skipped: Array<{ id: string; title: string; stepCount: number }> = [];

  for (const recipe of recipes) {
    const steps = (recipe as any).steps ?? [];
    const allText = steps.map((s: any) => s.beschrijving || '').join(' ');

    if (steps.length === 0) continue;

    // --- Oven/BBQ temperature ---
    const ovenMatch = allText.match(
      /(?:oven|voorverwarm|verwarm|grill|bbq|barbecue)[\w\s]*?(\d{2,3})\s*°?\s*(?:C|graden)?/i
    ) || allText.match(
      /(\d{2,3})\s*°\s*C?(?:\s*(hetelucht|boven[\s\/\-]?onderwarmte|onder[\s\/\-]?bovenwarmte|grillen|grill))?/i
    ) || allText.match(
      /(\d{2,3})\s+graden(?:\s+(?:Celsius|C))?(?:\s*(hetelucht|boven[\s\/\-]?onderwarmte|grillen|grill))?/i
    );

    // --- Core temperature ---
    const kernMatch = allText.match(
      /kern(?:temperatuur)?\s*(?:van)?\s*(\d{2,3})\s*°?\s*C?/i
    ) || allText.match(
      /(\d{2,3})\s*°?\s*C?\s*kern(?:temperatuur)?/i
    ) || allText.match(
      /intern(?:e)?\s*temperatuur\s*(?:van)?\s*(\d{2,3})\s*°?\s*C?/i
    );

    let ovenTemp: string | null = null;
    let kernTemp: string | null = null;

    if (ovenMatch) {
      const num = parseInt(ovenMatch[1]);
      if (num >= 80 && num <= 300) {
        const suffix = ovenMatch[2] ? ` ${ovenMatch[2].toLowerCase()}` : '';
        ovenTemp = `${ovenMatch[1]}°C${suffix}`;
      }
    }

    if (kernMatch) {
      const num = parseInt(kernMatch[1]);
      if (num >= 30 && num <= 100) {
        kernTemp = `${kernMatch[1]}°C`;
      }
    }

    // Only update fields that are currently empty
    const existingTemp = (recipe as any).temperatuur;
    const existingKern = (recipe as any).kerntemperatuur;
    if ((!existingTemp && ovenTemp) || (!existingKern && kernTemp)) {
      const updateData: any = {};
      if (!existingTemp && ovenTemp) updateData.temperatuur = ovenTemp;
      if (!existingKern && kernTemp) updateData.kerntemperatuur = kernTemp;

      await supabaseAdmin
        .from('recipes')
        .update(updateData)
        .eq('id', recipe.id);

      updated++;
      results.push({ id: recipe.id, title: (recipe as any).title, temperatuur: ovenTemp, kerntemperatuur: kernTemp });
    } else {
      skipped.push({ id: recipe.id, title: (recipe as any).title, stepCount: steps.length });
    }
  }

  return NextResponse.json({ updated, total: recipes.length, results, skipped: skipped.slice(0, 10) });
}
