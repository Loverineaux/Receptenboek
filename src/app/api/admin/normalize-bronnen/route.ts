import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeBron } from '@/lib/extraction/scrape';

/**
 * One-time migration: collapse duplicate bron filter entries that differ only
 * in raw-hostname vs nice-display-name form (e.g. "eefkooktzo.nl" alongside
 * "Eef Kookt Zo", "picnic.app" alongside "Picnic"). Walks every distinct
 * bron, feeds it through normalizeBron, and rewrites any recipes whose stored
 * bron changes value.
 */
export async function POST() {
  const { data: rows, error: selectError } = await supabaseAdmin
    .from('recipes')
    .select('bron')
    .not('bron', 'is', null);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  const distinct = new Set<string>();
  for (const r of rows ?? []) {
    if (typeof r.bron === 'string' && r.bron.trim()) distinct.add(r.bron);
  }

  const changes: { from: string; to: string; updated: number }[] = [];
  for (const original of distinct) {
    const normalized = normalizeBron(original);
    if (!normalized || normalized === original) continue;

    const { error: updateError, count } = await supabaseAdmin
      .from('recipes')
      .update({ bron: normalized }, { count: 'exact' })
      .eq('bron', original);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update "${original}": ${updateError.message}` },
        { status: 500 },
      );
    }

    changes.push({ from: original, to: normalized, updated: count ?? 0 });
  }

  return NextResponse.json({
    scanned: distinct.size,
    changed: changes.length,
    changes,
  });
}
