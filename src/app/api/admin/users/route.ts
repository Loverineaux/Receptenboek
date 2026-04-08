import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, is_blocked, created_at, last_seen')
    .order('created_at', { ascending: false });

  // Get recipe counts per user
  const { data: recipes } = await supabaseAdmin
    .from('recipes')
    .select('user_id');

  const recipeCounts = new Map<string, number>();
  for (const r of recipes ?? []) {
    recipeCounts.set(r.user_id, (recipeCounts.get(r.user_id) ?? 0) + 1);
  }

  const users = (profiles ?? []).map((p: any) => ({
    ...p,
    recipe_count: recipeCounts.get(p.id) ?? 0,
  }));

  return NextResponse.json(users);
}
