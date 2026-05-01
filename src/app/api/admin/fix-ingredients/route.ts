import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

/**
 * Pattern that flags an ingredient row as suspicious. Two main shapes:
 *   1. Quantity stuck in naam:  "Volkoren spaghetti 120 gram"
 *   2. Two ingredients merged:  "Sojasaus (groene dop) 40 ml groene aspergetips"
 *
 * Both look like a number adjacent to a Dutch cooking unit.
 */
const QUANTITY_IN_NAME_RE =
  /\d+[.,]?\d*\s*(gram|gr\.?|g\b|kg|ml\.?|cl|dl|l\b|el|tl|eetlepels?|theelepels?|stuks?|st\.?|teentjes?|tenen?|takjes?|snufjes?|snuf|scheutjes?|scheut|handvol|bosjes?|blikjes?|zakjes?|plakjes?|sneetjes?|blaadjes?|kopjes?|bekers?)/i;

interface SplitResult {
  idx: number;
  parts: Array<{ hoeveelheid: string | null; eenheid: string | null; naam: string }>;
}

/** POST — find and fix ingredients with quantities stuck in the naam field
 *  AND ingredients where two items got merged into one row. */
export async function POST() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  // Pull every ingredient row whose naam looks suspicious — regardless of
  // whether hoeveelheid is set, because the "merged two ingredients" case
  // already has the first quantity in the column.
  const { data: allRows } = await supabaseAdmin
    .from('ingredients')
    .select('id, recipe_id, hoeveelheid, eenheid, naam, sort_order')
    .order('recipe_id');

  const needsFix = (allRows ?? []).filter(
    (i) => typeof i.naam === 'string' && QUANTITY_IN_NAME_RE.test(i.naam),
  );

  if (needsFix.length === 0) {
    return NextResponse.json({
      fixed: 0,
      split: 0,
      total: 0,
      message: 'Geen ingrediënten gevonden met hoeveelheden in de naam',
    });
  }

  // Provide enough context per row so Claude can decide whether the row is
  // one ingredient with the quantity misplaced, or two ingredients that
  // should be split.
  const ingredientLines = needsFix
    .map(
      (i, idx) =>
        `${idx}: hoeveelheid="${i.hoeveelheid ?? ''}" eenheid="${i.eenheid ?? ''}" naam="${i.naam}"`,
    )
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Onderzoek deze ingrediëntrijen uit een Nederlands receptenboek. Sommige hebben:
A) De hoeveelheid is in de naam beland — splits die uit ("Volkoren spaghetti 120 gram" → 120 gram + naam Volkoren spaghetti).
B) TWEE ingrediënten zijn in één rij geplakt — splits in twee aparte items met de juiste hoeveelheden bij de juiste namen.
C) Soms is hoeveelheid+eenheid OK — laat dan ongewijzigd.

Voorbeelden:
- hoeveelheid="200" eenheid="gram" naam="Sojasaus (groene dop) 40 ml groene aspergetips"
  → SPLITS naar twee items:
    [{"hoeveelheid":"40","eenheid":"ml","naam":"Sojasaus (groene dop)"},{"hoeveelheid":"200","eenheid":"gram","naam":"groene aspergetips"}]
  (Let op: de hoeveelheden horen bij de logisch passende ingrediënten — sojasaus is in ml, aspergetips in gram, niet andersom.)
- hoeveelheid="" eenheid="" naam="Volkoren spaghetti 120 gram (ongekookt)"
  → [{"hoeveelheid":"120","eenheid":"gram","naam":"Volkoren spaghetti (ongekookt)"}]
- hoeveelheid="1" eenheid="teen" naam="Knoflook 1½ teen"
  → [{"hoeveelheid":"1½","eenheid":"teen","naam":"Knoflook"}]
- hoeveelheid="1" eenheid="el" naam="Olijfolie" → niks veranderen.

EENHEID-NORMALISATIE: "gr."/"g" → "gram", "ml"→"ml", "el"→"el", "tl"→"tl", "teentje"/"teentjes" → "teen". Geen afkortingen met punt.

Ingrediënten:
${ingredientLines}

Antwoord ALLEEN als JSON array waarbij elk item: {"idx": <input-rij-nummer>, "parts": [<1 of 2 ingrediënten>]}. Geen markdown, geen uitleg.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  let parsed: SplitResult[];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return NextResponse.json(
      { error: 'Claude response kon niet geparsed worden', raw: text.slice(0, 500) },
      { status: 500 },
    );
  }

  let fixed = 0;
  let split = 0;
  for (const fix of parsed) {
    const original = needsFix[fix.idx];
    if (!original || !Array.isArray(fix.parts) || fix.parts.length === 0) continue;

    const first = fix.parts[0];
    const restParts = fix.parts.slice(1);

    const firstChanged =
      (first.hoeveelheid ?? null) !== (original.hoeveelheid ?? null) ||
      (first.eenheid ?? null) !== (original.eenheid ?? null) ||
      first.naam !== original.naam;

    if (firstChanged) {
      await supabaseAdmin
        .from('ingredients')
        .update({
          hoeveelheid: first.hoeveelheid || null,
          eenheid: first.eenheid || null,
          naam: first.naam,
        })
        .eq('id', original.id);
      fixed++;
    }

    // Split: insert any additional parts with the same sort_order as the
    // original. Postgres falls back to id ordering when sort_order ties,
    // so the older original row stays first and the new inserts come
    // right after it in the recipe view.
    if (restParts.length > 0) {
      const baseSort = original.sort_order ?? 0;
      const inserts = restParts.map((p) => ({
        recipe_id: original.recipe_id,
        hoeveelheid: p.hoeveelheid || null,
        eenheid: p.eenheid || null,
        naam: p.naam,
        sort_order: baseSort,
      }));
      await supabaseAdmin.from('ingredients').insert(inserts);
      split += restParts.length;
    }
  }

  return NextResponse.json({
    fixed,
    split,
    total: needsFix.length,
    message:
      split > 0
        ? `${fixed} ingrediënten hersteld, ${split} extra ingrediënten afgesplitst`
        : `${fixed} van ${needsFix.length} ingrediënten hersteld`,
  });
}
