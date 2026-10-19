/**
 * Seizoensdata voor ingrediënten.
 * `season_months` is een lijst met maandnummers (1–12). `null` = onbekend,
 * alle 12 maanden = jaarrond verkrijgbaar (niet seizoensgebonden).
 */

export const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
] as const;

export const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

export const ALL_MONTHS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Naam van een maand (1–12), kleine letters. */
export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

/** Huidige maand als 1–12. */
export function currentMonth(date: Date = new Date()): number {
  return date.getMonth() + 1;
}

/** Valideer onbekende invoer (bijv. van het model) naar een gesorteerde lijst 1–12, of null. */
export function normalizeMonths(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const set = new Set<number>();
  for (const v of input) {
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 12) set.add(n);
  }
  if (set.size === 0) return null;
  return Array.from(set).sort((a, b) => a - b);
}

export function isYearRound(months: number[] | null | undefined): boolean {
  return !!months && new Set(months).size === 12;
}

export function isInSeason(months: number[] | null | undefined, month: number): boolean {
  return !!months && months.includes(month);
}

/** In seizoen én niet jaarrond: gebruikt voor de "In het seizoen"-carrousel en -tag. */
export function isSeasonal(months: number[] | null | undefined, month: number): boolean {
  return isInSeason(months, month) && !isYearRound(months);
}

// ── Vrije tekst → maanden (best effort) ──

const MONTH_RE =
  '(jan(?:uari)?|feb(?:ruari)?|ma(?:a)?rt|mrt|apr(?:il)?|mei|jun[ie]?|jul[iy]?|aug(?:ustus)?|sep(?:t(?:ember)?)?|o[ck]t(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const SEASON_RE = '(lente|voorjaar|zomer|herfst|najaar|winter)';
const RANGE_SEP = String.raw`(?:\s*(?:tot en met|tot|t\/m|t\.m\.|-|–|—)\s*)`;

const MONTH_PREFIX: Record<string, number> = {
  jan: 1, feb: 2, maa: 3, mrt: 3, apr: 4, mei: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12,
};

const SEASON_MONTHS: Record<string, number[]> = {
  lente: [3, 4, 5],
  voorjaar: [3, 4, 5],
  zomer: [6, 7, 8],
  herfst: [9, 10, 11],
  najaar: [9, 10, 11],
  winter: [12, 1, 2],
};

function monthFromToken(token: string): number | null {
  return MONTH_PREFIX[token.slice(0, 3).toLowerCase()] ?? null;
}

function rangeMonths(from: number, to: number): number[] {
  const out: number[] = [];
  let m = from;
  for (let i = 0; i < 12; i++) {
    out.push(m);
    if (m === to) break;
    m = (m % 12) + 1;
  }
  return out;
}

/**
 * Probeert de vrije tekst in `season` om te zetten naar maanden.
 * Herkent "Jaarrond", "september tot december", "sep–dec", "mei t/m augustus",
 * losse maanden en seizoenen (lente/zomer/herfst/winter). Geeft null als niets
 * betrouwbaar herkend wordt.
 */
export function parseSeasonText(text: string | null | undefined): number[] | null {
  if (!text) return null;
  let s = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return null;

  const yearRoundRe = /jaar\s?rond|hele jaar|gehele jaar|het hele jaar|alle seizoenen|doorgaans het hele jaar/;
  const isYearRoundText = yearRoundRe.test(s);

  // Korte tekst die met "jaarrond" begint is eenduidig.
  if (isYearRoundText && /^\W*(het )?(jaar\s?rond|hele jaar|gehele jaar)/.test(s) && s.length < 30) {
    return [...ALL_MONTHS];
  }

  const found = new Set<number>();

  // 1. Maandbereiken ("sep–dec", "mei tot en met augustus")
  const rangeRe = new RegExp(String.raw`\b${MONTH_RE}\.?${RANGE_SEP}${MONTH_RE}\b\.?`, 'g');
  s = s.replace(rangeRe, (_m, a: string, b: string) => {
    const from = monthFromToken(a);
    const to = monthFromToken(b);
    if (from && to) rangeMonths(from, to).forEach((m) => found.add(m));
    return ' ';
  });

  // 2. Seizoensbereiken ("zomer tot herfst")
  const seasonRangeRe = new RegExp(String.raw`\b${SEASON_RE}${RANGE_SEP}${SEASON_RE}\b`, 'g');
  s = s.replace(seasonRangeRe, (_m, a: string, b: string) => {
    const first = SEASON_MONTHS[a];
    const last = SEASON_MONTHS[b];
    if (first && last) rangeMonths(first[0], last[last.length - 1]).forEach((m) => found.add(m));
    return ' ';
  });

  // 3. Losse maanden
  const monthRe = new RegExp(String.raw`\b${MONTH_RE}\b`, 'g');
  s = s.replace(monthRe, (_m, a: string) => {
    const m = monthFromToken(a);
    if (m) found.add(m);
    return ' ';
  });

  // 4. Losse seizoenen
  const seasonRe = new RegExp(String.raw`\b${SEASON_RE}\b`, 'g');
  s.replace(seasonRe, (_m, a: string) => {
    SEASON_MONTHS[a]?.forEach((m) => found.add(m));
    return ' ';
  });

  if (found.size > 0) return Array.from(found).sort((a, b) => a - b);
  if (isYearRoundText) return [...ALL_MONTHS];
  return null;
}
