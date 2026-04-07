import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST /api/notifications/subscribe — register FCM token
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token, device_name } = await request.json();
  if (!token) return NextResponse.json({ error: 'Token is verplicht' }, { status: 400 });

  // Upsert: update user_id if token exists for different user, or insert new
  const { data: existing } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id')
    .eq('fcm_token', token)
    .maybeSingle();

  if (existing) {
    if (existing.user_id !== user.id) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ user_id: user.id, device_name: device_name || null })
        .eq('id', existing.id);
    }
  } else {
    await supabaseAdmin.from('push_subscriptions').insert({
      user_id: user.id,
      fcm_token: token,
      device_name: device_name || null,
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/notifications/subscribe — remove FCM token
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: 'Token is verplicht' }, { status: 400 });

  await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('fcm_token', token)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
