import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  await supabaseAdmin
    .from('profiles')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
