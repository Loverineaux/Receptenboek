/**
 * Match recipe ingredients against a Dutch step text, so cook mode can show
 * the relevant (already portion-scaled) ingredients per step. Pure functions.
 */

export interface MatchableIngredient {
  naam: string;
}

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'");
}

/** Words that describe an ingredient but are not the ingredient itself. */
const STOP_WORDS = new Set([
  'vers', 'verse', 'fijn', 'fijne', 'grof', 'grove', 'grote', 'groot', 'kleine', 'klein',
  'rode', 'rood', 'groene', 'groen', 'gele', 'geel', 'witte', 'wit', 'zwarte', 'zwart',
  'extra', 'vergine', 'biologische', 'biologisch', 'zachte', 'harde', 'oude', 'jonge',
  'gesneden', 'gehakte', 'gepelde', 'gerasperde', 'geraspte',
  'gedroogde', 'gedroogd', 'gekookte', 'gekookt', 'gebakken', 'gerookte', 'gerookt',
  'naar', 'smaak', 'voor', 'het', 'een', 'de', 'van', 'met', 'zonder', 'of', 'en',
  'ongeveer', 'plus', 'beetje', 'handje', 'snufje', 'snuf', 'uit', 'blik', 'pot',
]);

function cleanName(naam: string): string {
  // Drop parentheticals and everything after the first comma ("ui, fijngesneden").
  return normalizeText(naam)
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;]/)[0]
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Candidate search keys for an ingredient: full name, head word, distinctive words. */
export function ingredientKeys(naam: string): string[] {
  const full = cleanName(naam);
  if (!full) return [];
  const words = full.split(' ');
  const keys = new Set<string>([full]);
  const last = words[words.length - 1];
  if (words.length > 1 && last.length >= 2 && !STOP_WORDS.has(last)) keys.add(last);
  words.forEach((w, i) => {
    if (i < words.length - 1 && w.length >= 4 && !STOP_WORDS.has(w)) keys.add(w);
  });
  return [...keys];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Singular/plural spelling variants of a single word. */
function wordVariants(word: string): string[] {
  const v = new Set<string>([word]);
  // Plural → singular stem ("tomaten" → "tomat" → "tomaat", "uien" → "ui")
  if (word.length > 4 && word.endsWith('en')) {
    const base = word.slice(0, -2);
    v.add(base);
    const m = /^(.*[^aeiou])([aeiou])([^aeiou])$/.exec(base);
    if (m) v.add(`${m[1]}${m[2]}${m[2]}${m[3]}`);
  }
  if (word.endsWith('s') && word.length > 3) v.add(word.slice(0, -1));
  // Singular → plural stem ("tomaat" → "tomat")
  const dbl = /^(.*[^aeiou])([aeiou])\2([^aeiou])$/.exec(word);
  if (dbl) v.add(`${dbl[1]}${dbl[2]}${dbl[3]}`);
  return [...v];
}

const SUFFIX = "(?:s|en|n|eren|'s|tje|tjes|je|jes)?";

function buildRegex(key: string): RegExp {
  const parts = key.split(' ');
  const head = parts.pop()!;
  const prefix = parts.length ? parts.map(escapeRe).join('\\s+') + '\\s+' : '';
  const alt = wordVariants(head).map(escapeRe).join('|');
  return new RegExp(`(?<![a-z0-9])${prefix}(?:${alt})${SUFFIX}(?![a-z0-9])`, 'g');
}

/**
 * Indexes of ingredients mentioned in the step text, ordered by first
 * position in the text. Longer names win (their span is consumed first),
 * and matching is word-bounded so "ui" never matches inside "fruit".
 */
export function matchStepIngredients(stepText: string, ingredients: MatchableIngredient[]): number[] {
  if (!stepText || ingredients.length === 0) return [];
  let text = normalizeText(stepText);

  const entries: Array<{ idx: number; key: string }> = [];
  ingredients.forEach((ing, idx) => {
    for (const key of ingredientKeys(ing.naam)) entries.push({ idx, key });
  });
  entries.sort((a, b) => b.key.length - a.key.length);

  const found = new Map<number, number>(); // idx -> first position
  for (const { idx, key } of entries) {
    const re = buildRegex(key);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (!found.has(idx) || m.index < found.get(idx)!) found.set(idx, m.index);
      // Consume the span so shorter keys cannot match inside it again
      text = text.slice(0, m.index) + ' '.repeat(m[0].length) + text.slice(m.index + m[0].length);
      re.lastIndex = m.index + m[0].length;
    }
  }
  return [...found.entries()].sort((a, b) => a[1] - b[1]).map(([idx]) => idx);
}
