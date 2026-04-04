import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  // Fetch all steps that have a titel matching "Stap X" / "Step X" patterns
  const { data: steps, error } = await supabaseAdmin
    .from('steps')
    .select('id, titel')
    .not('titel', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stepPattern = /^\s*(stap|step)\s*\d+\s*[.:\-]?\s*$/i;
  const prefixPattern = /^\s*(stap|step)\s*\d+\s*[.:\-]\s*/i;

  let cleaned = 0;
  let stripped = 0;

  for (const step of steps || []) {
    if (!step.titel) continue;

    let newTitel: string | null = step.titel;

    if (stepPattern.test(step.titel)) {
      // Entire title is just "Stap 1" → set to null
      newTitel = null;
    } else if (prefixPattern.test(step.titel)) {
      // Title starts with "Stap 1: ..." → strip prefix
      newTitel = step.titel.replace(prefixPattern, '').trim() || null;
      stripped++;
    } else {
      continue;
    }

    await supabaseAdmin
      .from('steps')
      .update({ titel: newTitel })
      .eq('id', step.id);

    cleaned++;
  }

  return NextResponse.json({
    message: `Opgeschoond: ${cleaned} stappen (${stripped} prefix gestript)`,
    total_checked: steps?.length || 0,
    cleaned,
    stripped,
  });
}
