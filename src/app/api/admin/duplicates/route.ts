import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** GET — find duplicate recipe pairs (same bron, same image, or very similar title) */
export async function GET() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { data: recipes } = await supabaseAdmin
    .from('recipes')
    .select('id, title, image_url, bron, created_at, user:profiles!recipes_user_id_fkey(display_name)')
    .order('created_at', { ascending: true });

  if (!recipes) return NextResponse.json({ pairs: [] });

  type Recipe = typeof recipes[number];
  type Pair = { original: Recipe; duplicate: Recipe; reason: string };
  const pairs: Pair[] = [];
  const usedAsDuplicate = new Set<string>();

  // Helper: normalize title for comparison
  const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const titleSimilarity = (a: string, b: string) => {
    const na = normTitle(a), nb = normTitle(b);
    const shorter = Math.min(na.length, nb.length);
    if (shorter < 3) return 0;
    let matches = 0;
    for (let k = 0; k < shorter; k++) { if (na[k] === nb[k]) matches++; }
    return matches / shorter;
  };

  // 1. Same bron + similar title — bron alone is too broad (just a website name)
  const bronMap = new Map<string, Recipe[]>();
  for (const r of recipes) {
    if (!r.bron || r.bron === 'Eigen recept') continue;
    const key = r.bron.toLowerCase().trim();
    if (!bronMap.has(key)) bronMap.set(key, []);
    bronMap.get(key)!.push(r);
  }
  for (const [, group] of bronMap) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (usedAsDuplicate.has(group[j].id)) continue;
        if (titleSimilarity(group[i].title, group[j].title) > 0.7) {
          pairs.push({ original: group[i], duplicate: group[j], reason: `Zelfde bron + vergelijkbare titel` });
          usedAsDuplicate.add(group[j].id);
        }
      }
    }
  }

  // 2. Same image_url
  const imgMap = new Map<string, Recipe[]>();
  for (const r of recipes) {
    if (!r.image_url) continue;
    if (!imgMap.has(r.image_url)) imgMap.set(r.image_url, []);
    imgMap.get(r.image_url)!.push(r);
  }
  for (const [, group] of imgMap) {
    if (group.length < 2) continue;
    const [original, ...dupes] = group;
    for (const dupe of dupes) {
      if (usedAsDuplicate.has(dupe.id)) continue;
      pairs.push({ original, duplicate: dupe, reason: 'Zelfde afbeelding' });
      usedAsDuplicate.add(dupe.id);
    }
  }

  // 3. Similar title (>85% match)
  const normalized = recipes.map((r) => ({
    ...r,
    _norm: r.title.toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      if (usedAsDuplicate.has(normalized[j].id)) continue;
      const a = normalized[i]._norm;
      const b = normalized[j]._norm;
      const shorter = Math.min(a.length, b.length);
      if (shorter < 3) continue;
      let matches = 0;
      for (let k = 0; k < shorter; k++) {
        if (a[k] === b[k]) matches++;
      }
      if (matches / shorter > 0.85) {
        const { _norm: _, ...original } = normalized[i];
        const { _norm: __, ...duplicate } = normalized[j];
        pairs.push({ original, duplicate, reason: 'Vergelijkbare titel' });
        usedAsDuplicate.add(normalized[j].id);
      }
    }
  }

  return NextResponse.json({ pairs, totalPairs: pairs.length });
}

/** DELETE — delete a specific recipe by ID */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { recipeId } = await request.json();
  if (!recipeId) {
    return NextResponse.json({ error: 'recipeId is verplicht' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('recipes')
    .delete()
    .eq('id', recipeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
