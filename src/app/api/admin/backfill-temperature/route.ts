import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  // Fetch all recipes without temperature that have steps
  const { data: recipes, error } = await supabaseAdmin
    .from('recipes')
    .select('id, title, steps(beschrijving)')
    .is('temperatuur', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ updated: 0, total: 0, message: 'Geen recepten zonder temperatuur gevonden' });
  }

  let updated = 0;
  const results: Array<{ id: string; title: string; temperatuur: string }> = [];
  const skipped: Array<{ id: string; title: string; stepCount: number }> = [];

  for (const recipe of recipes) {
    const steps = (recipe as any).steps ?? [];
    const allText = steps.map((s: any) => s.beschrijving || '').join(' ');

    if (steps.length === 0) continue;

    // Broad matching for temperature patterns:
    // "180°C", "180 °C", "180° C", "180 graden", "200 graden Celsius"
    // "oven op 180", "oven 200°", "voorverwarm de oven op 180"
    const match = allText.match(
      /(?:oven|voorverwarm|verwarm|grill|bbq|barbecue)[\w\s]*?(\d{2,3})\s*°?\s*(?:C|graden)?/i
    ) || allText.match(
      /(\d{2,3})\s*°\s*C?(?:\s*(hetelucht|boven[\s\/\-]?onderwarmte|onder[\s\/\-]?bovenwarmte|grillen|grill))?/i
    ) || allText.match(
      /(\d{2,3})\s+graden(?:\s+(?:Celsius|C))?(?:\s*(hetelucht|boven[\s\/\-]?onderwarmte|grillen|grill))?/i
    );

    if (match) {
      const degrees = match[1];
      const num = parseInt(degrees);
      // Skip unlikely temps (room temp, cooking times etc)
      if (num < 80 || num > 300) continue;

      const suffix = match[2] ? ` ${match[2].toLowerCase()}` : '';
      const temp = `${degrees}°C${suffix}`;

      await supabaseAdmin
        .from('recipes')
        .update({ temperatuur: temp })
        .eq('id', recipe.id);

      updated++;
      results.push({ id: recipe.id, title: (recipe as any).title, temperatuur: temp });
    } else {
      skipped.push({ id: recipe.id, title: (recipe as any).title, stepCount: steps.length });
    }
  }

  return NextResponse.json({ updated, total: recipes.length, results, skipped: skipped.slice(0, 10) });
}
