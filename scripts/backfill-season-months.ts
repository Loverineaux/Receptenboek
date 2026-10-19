/**
 * Vult generic_ingredients.season_months voor ingrediënten waar die nog NULL is.
 *
 * Stappen per ingrediënt:
 *   1. parseSeasonText(season): de bestaande vrije tekst omzetten (gratis, geen API-call).
 *   2. De rest: Claude (claude-haiku-5-5) vraagt per batch van ~40 namen naar het
 *      Nederlands/Belgische seizoen (maanden 1-12; alle 12 = jaarrond / niet seizoensgebonden).
 *
 * Gebruik (vanuit de projectroot):
 *   npx tsx scripts/backfill-season-months.ts              # dry-run (standaard): print alleen het plan
 *   npx tsx scripts/backfill-season-months.ts --dry-run    # idem, expliciet
 *   npx tsx scripts/backfill-season-months.ts --apply      # schrijft naar de database
 *
 * Leest NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en ANTHROPIC_API_KEY uit .env.local.
 * Let op: ook een dry-run roept de Anthropic API aan (betaald) voor de ingrediënten waar de tekst niet volstaat.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { ALL_MONTHS, normalizeMonths, parseSeasonText } from '../src/lib/ingredients/season';

const MODEL = 'claude-haiku-5-5';
// Kleine batches + ruime max_tokens: Haiku 5.5 denkt standaard mee en dat telt
// mee in max_tokens; bij 40 namen en 1024 tokens werd het antwoord afgekapt.
const BATCH_SIZE = 25;

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith('#')) continue;
      let value = m[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  } catch {
    // geen .env.local: vertrouw op de omgeving
  }
}

interface Row {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
}

function fmt(months: number[]): string {
  return months.length === 12 ? 'jaarrond' : months.join(',');
}

/** Haalt een JSON-object of -array uit modeltekst, ook met markdown-omheining of extra tekst. */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // val terug op de eerste { ... } of [ ... ]
  }
  const start = cleaned.search(/[\[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === '{' ? '}' : ']';
  const end = cleaned.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function askClaude(client: Anthropic, batch: Row[]): Promise<Map<string, number[]>> {
  const list = batch.map((r, i) => `${i + 1}. ${r.name}${r.category ? ` (${r.category})` : ''}`).join('\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    output_config: { effort: 'low' },
    system:
      'Je bent een culinair expert. Je geeft het seizoen van ingrediënten in Nederland en België. Antwoord ALLEEN met valid JSON, zonder uitleg of markdown.',
    messages: [
      {
        role: 'user',
        content: `Geef voor elk ingrediënt de maanden (1 = januari ... 12 = december) waarin het in Nederland/België in seizoen is.
Gebruik alle 12 maanden als het jaarrond verkrijgbaar is of niet seizoensgebonden is (bijvoorbeeld zuivel, vlees, vis, droge waren, kruiden uit pot, conserven).

Antwoord als JSON-object waarin de sleutel het nummer uit de lijst is en de waarde een array met maandnummers, bijvoorbeeld:
{"1": [9,10,11,12], "2": [1,2,3,4,5,6,7,8,9,10,11,12]}

Ingrediënten:
${list}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');

  if (response.stop_reason !== 'end_turn') {
    console.log(`(stop_reason: ${response.stop_reason})`);
  }

  const parsed = extractJson(text);
  const result = new Map<string, number[]>();
  if (!parsed || typeof parsed !== 'object') return result;

  if (Array.isArray(parsed)) {
    // Toegestane variant: [{ "n": 1, "months": [...] }, ...] of een array van arrays in volgorde
    parsed.forEach((item, i) => {
      if (Array.isArray(item)) {
        const months = normalizeMonths(item);
        if (months && batch[i]) result.set(batch[i].id, months);
      } else if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const idx = Number(rec.n ?? rec.nr ?? rec.id ?? i + 1) - 1;
        const months = normalizeMonths(rec.months ?? rec.maanden);
        if (months && batch[idx]) result.set(batch[idx].id, months);
      }
    });
    return result;
  }

  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const idx = Number(key) - 1;
    const months = normalizeMonths(value);
    if (Number.isInteger(idx) && months && batch[idx]) result.set(batch[idx].id, months);
  }
  return result;
}

async function main() {
  loadEnvLocal();
  const apply = process.argv.includes('--apply');
  if (apply && process.argv.includes('--dry-run')) {
    console.error('Kies --apply of --dry-run, niet beide.');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn vereist (.env.local).');
    process.exit(1);
  }

  console.log(apply ? 'MODUS: --apply (schrijft naar de database)' : 'MODUS: dry-run (er wordt niets weggeschreven)');

  const supabase = createClient(url, serviceKey);

  // Alle ingrediënten zonder season_months (gepagineerd)
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('generic_ingredients')
      .select('id, name, category, season')
      .is('season_months', null)
      .order('name')
      .range(from, from + 999);
    if (error) {
      console.error('Ophalen mislukt:', error.message);
      process.exit(1);
    }
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  console.log(`${rows.length} ingrediënten zonder season_months.`);

  const planned = new Map<string, { row: Row; months: number[]; source: 'tekst' | 'ai' }>();
  const needsAi: Row[] = [];

  for (const row of rows) {
    const months = parseSeasonText(row.season);
    if (months) planned.set(row.id, { row, months, source: 'tekst' });
    else needsAi.push(row);
  }
  console.log(`${planned.size} herkend uit de seizoenstekst, ${needsAi.length} via Claude (${MODEL}).`);

  if (needsAi.length > 0) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY ontbreekt (.env.local); de rest wordt overgeslagen.');
    } else {
      const client = new Anthropic();
      for (let i = 0; i < needsAi.length; i += BATCH_SIZE) {
        const batch = needsAi.slice(i, i + BATCH_SIZE);
        process.stdout.write(`Batch ${i / BATCH_SIZE + 1}/${Math.ceil(needsAi.length / BATCH_SIZE)} (${batch.length} namen)... `);
        try {
          const answer = await askClaude(client, batch);
          let ok = 0;
          for (const row of batch) {
            const months = answer.get(row.id);
            if (months) {
              planned.set(row.id, { row, months, source: 'ai' });
              ok++;
            }
          }
          console.log(`${ok} antwoorden${ok < batch.length ? `, ${batch.length - ok} ontbreken` : ''}`);
        } catch (err) {
          console.log(`mislukt: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  console.log('\nGeplande updates:');
  for (const { row, months, source } of planned.values()) {
    console.log(`  [${source}] ${row.name}${row.season ? ` ("${row.season}")` : ''} -> ${fmt(months)}`);
  }
  const unresolved = rows.filter((r) => !planned.has(r.id));
  if (unresolved.length > 0) {
    console.log(`\nZonder resultaat (blijven NULL): ${unresolved.map((r) => r.name).join(', ')}`);
  }
  console.log(`\nTotaal: ${planned.size} updates gepland, ${unresolved.length} zonder resultaat.`);

  if (!apply) {
    console.log('Dry-run: niets geschreven. Draai met --apply om weg te schrijven.');
    return;
  }

  let written = 0;
  let failed = 0;
  for (const { row, months } of planned.values()) {
    const safe = months.length === 12 ? ALL_MONTHS : months;
    const { error } = await supabase
      .from('generic_ingredients')
      .update({ season_months: safe })
      .eq('id', row.id)
      .is('season_months', null); // overschrijf nooit bestaande data
    if (error) {
      failed++;
      console.error(`  Fout bij ${row.name}: ${error.message}`);
    } else {
      written++;
    }
  }
  console.log(`Klaar: ${written} bijgewerkt, ${failed} mislukt.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
