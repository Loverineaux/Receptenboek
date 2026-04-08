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

  await supabaseAdmin
    .from('profiles')
    .update({ is_blocked: false })
    .eq('id', params.id);

  // Unban in auth
  await supabaseAdmin.auth.admin.updateUserById(params.id, {
    ban_duration: 'none',
  });

  return NextResponse.json({ success: true });
}
