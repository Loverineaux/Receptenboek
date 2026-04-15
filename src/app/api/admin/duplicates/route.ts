import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** GET — find duplicate recipes (same bron, same image, or very similar title) */
export async function GET() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { data: recipes } = await supabaseAdmin
    .from('recipes')
    .select('id, title, image_url, bron, created_at, user:profiles!recipes_user_id_fkey(display_name)')
    .order('title', { ascending: true });

  if (!recipes) return NextResponse.json({ groups: [] });

  const groups: { reason: string; recipes: typeof recipes }[] = [];
  const usedIds = new Set<string>();

  // 1. Group by exact bron (same source URL)
  const bronMap = new Map<string, typeof recipes>();
  for (const r of recipes) {
    if (!r.bron || r.bron === 'Eigen recept') continue;
    const key = r.bron.toLowerCase().trim();
    if (!bronMap.has(key)) bronMap.set(key, []);
    bronMap.get(key)!.push(r);
  }
  for (const [bron, group] of bronMap) {
    if (group.length > 1) {
      groups.push({ reason: `Zelfde bron: ${bron}`, recipes: group });
      group.forEach((r: any) => usedIds.add(r.id));
    }
  }

  // 2. Group by exact image_url
  const imgMap = new Map<string, typeof recipes>();
  for (const r of recipes) {
    if (!r.image_url) continue;
    if (!imgMap.has(r.image_url)) imgMap.set(r.image_url, []);
    imgMap.get(r.image_url)!.push(r);
  }
  for (const [, group] of imgMap) {
    if (group.length > 1 && !group.every((r: any) => usedIds.has(r.id))) {
      groups.push({ reason: 'Zelfde afbeelding', recipes: group });
      group.forEach((r: any) => usedIds.add(r.id));
    }
  }

  // 3. Group by similar title (normalized, >85% match)
  const normalized = recipes.map((r: any) => ({
    ...r,
    _norm: r.title.toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));
  for (let i = 0; i < normalized.length; i++) {
    const group = [normalized[i]];
    for (let j = i + 1; j < normalized.length; j++) {
      if (usedIds.has(normalized[j].id)) continue;
      const a = normalized[i]._norm;
      const b = normalized[j]._norm;
      const shorter = Math.min(a.length, b.length);
      if (shorter < 3) continue;
      let matches = 0;
      for (let k = 0; k < shorter; k++) {
        if (a[k] === b[k]) matches++;
      }
      if (matches / shorter > 0.85) {
        group.push(normalized[j]);
      }
    }
    if (group.length > 1 && !group.every((r: any) => usedIds.has(r.id))) {
      groups.push({
        reason: `Vergelijkbare titel: "${normalized[i].title}"`,
        recipes: group.map(({ _norm, ...r }: any) => r),
      });
      group.forEach((r: any) => usedIds.add(r.id));
    }
  }

  return NextResponse.json({ groups, totalDuplicateGroups: groups.length });
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
