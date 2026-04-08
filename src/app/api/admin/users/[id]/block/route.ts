import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  // Don't allow blocking yourself
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === params.id) {
    return NextResponse.json({ error: 'Je kunt jezelf niet blokkeren' }, { status: 400 });
  }

  await supabaseAdmin
    .from('profiles')
    .update({ is_blocked: true })
    .eq('id', params.id);

  // Ban in auth
  await supabaseAdmin.auth.admin.updateUserById(params.id, {
    ban_duration: '876000h',
  });

  return NextResponse.json({ success: true });
}
