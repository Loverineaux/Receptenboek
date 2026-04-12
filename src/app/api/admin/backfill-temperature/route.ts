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
  const { data: recipes } = await supabaseAdmin
    .from('recipes')
    .select('id, steps(beschrijving)')
    .is('temperatuur', null);

  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ updated: 0, message: 'Geen recepten zonder temperatuur gevonden' });
  }

  let updated = 0;
  const results: Array<{ id: string; temperatuur: string }> = [];

  for (const recipe of recipes) {
    const steps = (recipe as any).steps ?? [];
    const allText = steps.map((s: any) => s.beschrijving || '').join(' ');

    // Match patterns like "180°C", "200 graden", "180 °C hetelucht", "160°C boven/onderwarmte"
    const match = allText.match(
      /(\d{2,3})\s*°?\s*(?:C|graden)(?:\s*(hetelucht|boven[\s\/\-]?onderwarmte|onder[\s\/\-]?bovenwarmte|grillen|grill))?/i
    );

    if (match) {
      const temp = `${match[1]}°C${match[2] ? ` ${match[2].toLowerCase()}` : ''}`;

      await supabaseAdmin
        .from('recipes')
        .update({ temperatuur: temp })
        .eq('id', recipe.id);

      updated++;
      results.push({ id: recipe.id, temperatuur: temp });
    }
  }

  return NextResponse.json({ updated, total: recipes.length, results });
}
