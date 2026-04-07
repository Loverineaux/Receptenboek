import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/notifications/preferences
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Upsert: create defaults if missing (for users created before this feature)
  const { data: existing } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    const { data: created, error } = await supabaseAdmin
      .from('notification_preferences')
      .insert({ user_id: user.id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(created);
  }

  return NextResponse.json(existing);
}

// PUT /api/notifications/preferences
export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  const allowedFields = [
    'comment', 'reply', 'favorite', 'rating', 'comment_like',
    'collection_follow', 'collection_invite', 'push_enabled',
  ];
  const updates: Record<string, boolean> = {};
  for (const field of allowedFields) {
    if (typeof body[field] === 'boolean') {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Geen geldige velden' }, { status: 400 });
  }

  // Upsert in case row doesn't exist yet
  const { data: existing } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    await supabaseAdmin
      .from('notification_preferences')
      .insert({ user_id: user.id, ...updates });
  } else {
    await supabaseAdmin
      .from('notification_preferences')
      .update(updates)
      .eq('user_id', user.id);
  }

  // Return updated preferences
  const { data } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json(data);
}
