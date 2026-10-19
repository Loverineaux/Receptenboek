/**
 * Dutch step-text duration parsing for cook-mode timers. Pure functions.
 *
 * parseStepDuration("Laat 10-15 minuten zachtjes pruttelen.")
 *   → { seconds: 900, label: "Pruttelen" }
 */

export interface StepDuration {
  seconds: number;
  label: string;
}

const WORD_NUMBERS: Record<string, number> = {
  een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9,
  tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15,
  twintig: 20, vijfentwintig: 25, dertig: 30, veertig: 40, vijfenveertig: 45,
  vijftig: 50, zestig: 60,
};
const WORD_ALT = Object.keys(WORD_NUMBERS).sort((a, b) => b.length - a.length).join('|');

const NUM = '(\\d+(?:[.,]\\d+)?)';
const UNIT = '(uren|uur|minuten|minuut|mins?\\b|seconden|seconde|secs?\\b)';
const RANGE_SEP = '\\s*(?:-|–|—|tot|à)\\s*';

function toNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'));
}

function unitSeconds(unit: string): number {
  if (unit.startsWith('u')) return 3600;
  if (unit.startsWith('m')) return 60;
  return 1;
}

interface Candidate {
  index: number;
  length: number;
  seconds: number;
}

function findCandidates(text: string): Candidate[] {
  const out: Candidate[] = [];

  const run = (pattern: string, fn: (m: RegExpExecArray) => number) => {
    const re = new RegExp(pattern, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const seconds = fn(m);
      if (seconds > 0) out.push({ index: m.index, length: m[0].length, seconds: Math.round(seconds) });
    }
  };

  // Special Dutch fractions of an hour
  run('\\b(?:anderhalf|anderhalve)\\s+uur\\b', () => 5400);
  run('\\bdriekwartier\\b', () => 2700);
  run('\\b(?:een\\s+)?(?:half|halve)\\s+uur\\b', () => 1800);
  run('\\b(?:een\\s+)?kwartier\\b', () => 900);

  // "1 uur en 15 minuten" / "1 uur 15 min"
  run(`\\b${NUM}\\s*uur\\s*(?:en\\s*)?${NUM}\\s*min(?:uten|uut)?\\b`, (m) => toNumber(m[1]) * 3600 + toNumber(m[2]) * 60);

  // Numeric range → upper bound ("10-15 minuten", "1 tot 2 uur")
  run(`\\b${NUM}${RANGE_SEP}${NUM}\\s*${UNIT}`, (m) => toNumber(m[2]) * unitSeconds(m[3].toLowerCase()));

  // Single numeric ("12 minuten", "1,5 uur")
  run(`\\b${NUM}\\s*${UNIT}`, (m) => toNumber(m[1]) * unitSeconds(m[2].toLowerCase()));

  // Written numbers ("tien minuten", "twee uur")
  run(`\\b(${WORD_ALT})\\s+${UNIT}`, (m) => WORD_NUMBERS[m[1].toLowerCase()] * unitSeconds(m[2].toLowerCase()));

  return out;
}

// Order matters for equal distance: more specific first.
const VERBS: Array<{ re: RegExp; label: string }> = [
  { re: /\btrekken\b|\btrekt\b/i, label: 'Laten trekken' },
  { re: /\bpruttel\w*/i, label: 'Pruttelen' },
  { re: /\bsudder\w*/i, label: 'Sudderen' },
  { re: /\bfruit\w*/i, label: 'Fruiten' },
  { re: /\bstoof\w*|\bstoven\b/i, label: 'Stoven' },
  { re: /\bstom\w*/i, label: 'Stomen' },
  { re: /\bmarineer\w*|\bmarineren\b/i, label: 'Marineren' },
  { re: /\bgratineer\w*/i, label: 'Gratineren' },
  { re: /\broost\w*/i, label: 'Roosteren' },
  { re: /\bbraad\b|\bbraden\b|\bbraadt\b/i, label: 'Braden' },
  { re: /\bbak\b|\bbakken\b|\bbakt\b/i, label: 'Bakken' },
  { re: /\brijs\w*|\brijzen\b/i, label: 'Laten rijzen' },
  { re: /\brust\b|\brusten\b/i, label: 'Rusten' },
  { re: /\bafkoel\w*|\bkoel\w*/i, label: 'Afkoelen' },
  { re: /\bopwarm\w*/i, label: 'Opwarmen' },
  { re: /\bsmelt\w*|\bsmelten\b/i, label: 'Smelten' },
  { re: /\bkook\b|\bkookt\b|\bkoken\b|\bgaar\b/i, label: 'Koken' },
  { re: /\boven\b/i, label: 'In de oven' },
];

/** Cooking verb closest to the duration position; null if none found. */
export function findCookingLabel(text: string, nearIndex: number): string | null {
  let best: { label: string; dist: number } | null = null;
  for (const { re, label } of VERBS) {
    const g = new RegExp(re.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = g.exec(text))) {
      const dist = Math.abs(m.index - nearIndex);
      if (dist <= 50 && (!best || dist < best.dist)) best = { label, dist };
      if (m[0].length === 0) g.lastIndex++;
    }
  }
  return best?.label ?? null;
}

/** First duration found in a Dutch step text, or null. */
export function parseStepDuration(text: string): StepDuration | null {
  if (!text) return null;
  const candidates = findCandidates(text);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.index - b.index || b.length - a.length);
  const first = candidates[0];
  // Ignore nonsense above 24h
  if (first.seconds > 24 * 3600) return null;
  return { seconds: first.seconds, label: findCookingLabel(text, first.index) ?? 'Timer' };
}

/** 754 → "12:34", 3725 → "1:02:05" */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
