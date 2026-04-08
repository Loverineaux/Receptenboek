import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  // Delete replies first, then the comment
  await supabaseAdmin.from('comments').delete().eq('parent_id', params.id);
  await supabaseAdmin.from('comments').delete().eq('id', params.id);

  return NextResponse.json({ success: true });
}
