import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const userId = user.id;

  try {
    // 1. Anonymize profile — keep the row so foreign keys on recipes/comments stay intact
    await supabaseAdmin
      .from('profiles')
      .update({
        display_name: 'Anoniem',
        avatar_url: null,
        bio: null,
        email: null,
        last_seen: null,
      })
      .eq('id', userId);

    // 2. Clean up user-specific data (order matters for foreign keys)
    // First: delete replies to this user's comments
    const { data: userComments } = await supabaseAdmin
      .from('comments')
      .select('id')
      .eq('user_id', userId);
    const commentIds = (userComments ?? []).map((c: any) => c.id);
    if (commentIds.length > 0) {
      await supabaseAdmin.from('comments').delete().in('parent_id', commentIds);
    }
    // Then: delete user's own comments, ratings, etc.
    await Promise.all([
      supabaseAdmin.from('comments').delete().eq('user_id', userId),
      supabaseAdmin.from('ratings').delete().eq('user_id', userId),
      supabaseAdmin.from('notification_preferences').delete().eq('user_id', userId),
      supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId),
      supabaseAdmin.from('notifications').delete().eq('recipient_id', userId),
      supabaseAdmin.from('notifications').delete().eq('actor_id', userId),
      supabaseAdmin.from('favorites').delete().eq('user_id', userId),
      supabaseAdmin.from('collection_collaborators').delete().eq('user_id', userId),
      supabaseAdmin.from('collection_follows').delete().eq('user_id', userId),
    ]);

    // 3. Delete the auth user — this invalidates all sessions
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[DeleteAccount] Auth delete failed:', deleteError.message);
      // Fallback: ban the user so they cannot log in
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DeleteAccount] Error:', err);
    return NextResponse.json({ error: 'Kon account niet verwijderen' }, { status: 500 });
  }
}
