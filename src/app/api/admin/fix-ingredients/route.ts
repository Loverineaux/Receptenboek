import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/** POST — find and fix ingredients with quantities stuck in the naam field */
export async function POST() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  // Find ingredients where naam contains numbers (likely has quantity in naam)
  const { data: badIngredients } = await supabaseAdmin
    .from('ingredients')
    .select('id, recipe_id, hoeveelheid, eenheid, naam')
    .or('hoeveelheid.is.null,hoeveelheid.eq.')
    .order('recipe_id');

  if (!badIngredients || badIngredients.length === 0) {
    return NextResponse.json({ fixed: 0, total: 0 });
  }

  // Filter to only those where naam contains a number (likely misplaced quantity)
  const needsFix = badIngredients.filter((i) =>
    /\d/.test(i.naam) && i.naam.length > 2
  );

  if (needsFix.length === 0) {
    return NextResponse.json({ fixed: 0, total: badIngredients.length, message: 'Geen ingrediënten gevonden met hoeveelheden in de naam' });
  }

  // Batch process with Claude — send all at once for efficiency
  const ingredientLines = needsFix.map((i, idx) => `${idx}: ${i.naam}`).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Splits de volgende ingrediënten in hoeveelheid, eenheid en naam. Sommige hebben de hoeveelheid in de naam staan.

REGELS:
- "Peterselie 2 sprieten" → hoeveelheid: "2", eenheid: "sprieten", naam: "Peterselie"
- "Volkoren spaghetti 120 gram (ongekookt)" → hoeveelheid: "120", eenheid: "gram", naam: "Volkoren spaghetti (ongekookt)"
- "Peper & zout Naar smaak" → hoeveelheid: null, eenheid: null, naam: "Peper & zout naar smaak"
- "1½ teentjes Knoflook" → hoeveelheid: "1½", eenheid: "teen", naam: "Knoflook"
- Standaardiseer: "gr."/"g" → "gram", "el" → "el", "tl" → "tl", "teen"/"teentje"/"teentjes" → "teen"

Ingrediënten:
${ingredientLines}

Antwoord ALLEEN als JSON array. Elk item: {"idx": number, "hoeveelheid": string|null, "eenheid": string|null, "naam": string}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  let parsed: { idx: number; hoeveelheid: string | null; eenheid: string | null; naam: string }[];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return NextResponse.json({ error: 'Claude response kon niet geparsed worden', raw: text }, { status: 500 });
  }

  // Apply fixes
  let fixed = 0;
  for (const fix of parsed) {
    const original = needsFix[fix.idx];
    if (!original) continue;

    // Only update if something actually changed
    const changed = fix.hoeveelheid !== original.hoeveelheid ||
      fix.eenheid !== original.eenheid ||
      fix.naam !== original.naam;

    if (changed) {
      await supabaseAdmin
        .from('ingredients')
        .update({
          hoeveelheid: fix.hoeveelheid || null,
          eenheid: fix.eenheid || null,
          naam: fix.naam,
        })
        .eq('id', original.id);
      fixed++;
    }
  }

  return NextResponse.json({
    fixed,
    total: needsFix.length,
    message: `${fixed} van ${needsFix.length} ingrediënten hersteld`,
  });
}
