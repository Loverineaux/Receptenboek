import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/notifications/log — admin: all notifications with filters
export async function GET(request: NextRequest) {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const type = url.searchParams.get('type') || '';
  const userId = url.searchParams.get('user') || '';
  const days = parseInt(url.searchParams.get('days') || '0');
  const limit = 50;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('notifications')
    .select(
      '*, actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url), recipient:profiles!notifications_recipient_id_fkey(id, display_name, avatar_url)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  // Filter by type
  if (type) {
    query = query.eq('type', type);
  }

  // Filter by user (as actor or recipient)
  if (userId) {
    query = query.or(`actor_id.eq.${userId},recipient_id.eq.${userId}`);
  }

  // Filter by date range
  if (days > 0) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notifications: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}

// DELETE /api/notifications/log — admin: cleanup old notifications
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '90');
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { count } = await supabaseAdmin
    .from('notifications')
    .delete()
    .lt('created_at', cutoff)
    .select('*', { count: 'exact', head: true });

  // Actually delete (the above select doesn't delete, need separate call)
  await supabaseAdmin
    .from('notifications')
    .delete()
    .lt('created_at', cutoff);

  return NextResponse.json({ deleted: count ?? 0 });
}
