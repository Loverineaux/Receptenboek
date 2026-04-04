import type { SupabaseClient } from '@supabase/supabase-js';

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const SKIP_REGEX =
  /^(olie|olijfolie|zonnebloemolie|peper en zout|peper & zout|naar smaak|water|bakvet|roomboter)$/i;

const STRIP_PREFIXES = [
  'verse ',
  'versgemalen ',
  'gehakte ',
  'gesneden ',
  'geraspte ',
  'grof gehakte ',
];

function normalize(name: string): string {
  let n = name.toLowerCase().trim();
  for (const prefix of STRIP_PREFIXES) {
    if (n.startsWith(prefix)) {
      n = n.slice(prefix.length);
      break; // only strip one prefix
    }
  }
  return n.trim();
}

const FRACTION_MAP: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
};

/**
 * Parse a Dutch quantity string into a number.
 * Handles Unicode fractions, "1/2"-style fractions, Dutch words, and comma decimals.
 */
export function parseHoeveelheid(text: string): number | null {
  if (!text) return null;

  let t = text.trim();

  // Dutch words
  if (/^halve?$/i.test(t)) return 0.5;
  if (/^kwart$/i.test(t)) return 0.25;

  // Unicode fraction only (e.g. "½")
  if (FRACTION_MAP[t] !== undefined) return FRACTION_MAP[t];

  // Number + unicode fraction (e.g. "1½")
  for (const [frac, val] of Object.entries(FRACTION_MAP)) {
    if (t.includes(frac)) {
      const before = t.replace(frac, '').trim();
      const whole = before ? parseFloat(before) : 0;
      if (!isNaN(whole)) return whole + val;
    }
  }

  // Slash fractions (e.g. "1/2" or "3/4")
  const slashMatch = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch) {
    const num = parseInt(slashMatch[1], 10);
    const den = parseInt(slashMatch[2], 10);
    if (den !== 0) return num / den;
  }

  // Mixed number with slash fraction (e.g. "1 1/2")
  const mixedMatch = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den !== 0) return whole + num / den;
  }

  // Comma decimal (e.g. "1,5")
  t = t.replace(',', '.');

  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

// ────────────────────────────────────────────
// matchIngredient
// ────────────────────────────────────────────

/**
 * Match a recipe ingredient name to a generic_ingredient id.
 * Returns the generic_ingredient id, or null if no match / skipped.
 */
export async function matchIngredient(
  naam: string,
  supabase: SupabaseClient
): Promise<string | null> {
  // 1. Skip non-ingredients
  if (SKIP_REGEX.test(naam.trim())) return null;

  const normalized = normalize(naam);

  // 2. Exact match on name
  const { data: exact } = await supabase
    .from('generic_ingredients')
    .select('id')
    .ilike('name', normalized)
    .limit(1)
    .single();

  if (exact?.id) return exact.id;

  // 3 & 4. Alias + substring match — fetch all generics once
  const { data: allGenerics } = await supabase
    .from('generic_ingredients')
    .select('id, name, aliases')
    .limit(500);

  if (!allGenerics || allGenerics.length === 0) return null;

  // 3. Alias match
  for (const gi of allGenerics) {
    const aliases: string[] = gi.aliases ?? [];
    for (const alias of aliases) {
      if (alias.toLowerCase() === normalized) {
        return gi.id;
      }
    }
  }

  // 4. Substring match on aliases first (more specific), then name
  // Sort by longest match first to prefer "kastanjechampignon" alias over "champignon" name
  const allNames: { id: string; text: string }[] = [];
  for (const gi of allGenerics) {
    for (const alias of (gi.aliases ?? []) as string[]) {
      allNames.push({ id: gi.id, text: alias.toLowerCase() });
    }
    if (gi.name) allNames.push({ id: gi.id, text: gi.name.toLowerCase() });
  }
  allNames.sort((a, b) => b.text.length - a.text.length);

  for (const entry of allNames) {
    if (normalized.includes(entry.text) || entry.text.includes(normalized)) {
      return entry.id;
    }
  }

  return null;
}

// ────────────────────────────────────────────
// convertToGrams
// ────────────────────────────────────────────

interface IngredientConversion {
  gram_per_piece?: number | null;
  gram_per_ml?: number | null;
  gram_per_el?: number | null;
  gram_per_tl?: number | null;
}

interface UnitConversionRow {
  unit_name: string;
  unit_aliases: string[];
  ml_equivalent?: number | null;
  gram_default?: number | null;
}

/**
 * Convert a quantity + unit into grams using ingredient-specific and generic conversions.
 */
export function convertToGrams(
  hoeveelheid: string | null,
  eenheid: string | null,
  ingredient: IngredientConversion,
  unitConversions: UnitConversionRow[]
): number | null {
  const amount = hoeveelheid ? parseHoeveelheid(hoeveelheid) : null;
  if (amount == null || amount <= 0) return null;

  const unit = (eenheid ?? '').toLowerCase().trim();

  // gram / g / empty — direct
  if (!unit || unit === 'gram' || unit === 'g') {
    return amount;
  }

  // kg
  if (unit === 'kg') {
    return amount * 1000;
  }

  // stuks / stuk
  if (unit === 'stuks' || unit === 'stuk') {
    return ingredient.gram_per_piece ? amount * ingredient.gram_per_piece : null;
  }

  // eetlepel
  if (unit === 'el' || unit === 'eetlepel') {
    return amount * (ingredient.gram_per_el ?? 15);
  }

  // theelepel
  if (unit === 'tl' || unit === 'theelepel') {
    return amount * (ingredient.gram_per_tl ?? 5);
  }

  // ml
  if (unit === 'ml') {
    return amount * (ingredient.gram_per_ml ?? 1);
  }

  // dl
  if (unit === 'dl') {
    const mlAmount = amount * 100;
    return mlAmount * (ingredient.gram_per_ml ?? 1);
  }

  // liter
  if (unit === 'l' || unit === 'liter') {
    const mlAmount = amount * 1000;
    return mlAmount * (ingredient.gram_per_ml ?? 1);
  }

  // Look up in unitConversions table
  for (const uc of unitConversions) {
    const names = [uc.unit_name, ...(uc.unit_aliases ?? [])].map((n) =>
      n.toLowerCase()
    );
    if (names.includes(unit)) {
      if (uc.gram_default) {
        return amount * uc.gram_default;
      }
      if (uc.ml_equivalent) {
        return amount * uc.ml_equivalent * (ingredient.gram_per_ml ?? 1);
      }
    }
  }

  return null;
}
