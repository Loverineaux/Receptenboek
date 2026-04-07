import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/notifications — fetch user's notifications
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url)')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: data ?? [] });
}

// PATCH /api/notifications — mark as read/unread
export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const isRead = body.is_read !== false; // default to marking as read

  if (body.all) {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: isRead })
      .eq('recipient_id', user.id)
      .neq('is_read', isRead);
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: isRead })
      .eq('recipient_id', user.id)
      .in('id', body.ids);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/notifications — delete notifications
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  if (body.all) {
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('recipient_id', user.id);
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('recipient_id', user.id)
      .in('id', body.ids);
  }

  return NextResponse.json({ success: true });
}
