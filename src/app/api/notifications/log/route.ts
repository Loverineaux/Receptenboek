import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/notifications/log — admin: all notifications with actor + recipient
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('notifications')
    .select(
      '*, actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url), recipient:profiles!notifications_recipient_id_fkey(id, display_name, avatar_url)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notifications: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
