import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === params.id) {
    return NextResponse.json({ error: 'Je kunt je eigen rol niet wijzigen' }, { status: 400 });
  }

  const { role } = await request.json();
  if (!['user', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Ongeldige rol' }, { status: 400 });
  }

  await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', params.id);

  return NextResponse.json({ success: true });
}
