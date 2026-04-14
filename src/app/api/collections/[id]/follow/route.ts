import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

// POST /api/collections/[id]/follow — follow a collection
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // Check collection exists and user is not the owner
  const { data: collection } = await supabase
    .from('collections')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!collection) {
    return NextResponse.json({ error: 'Collectie niet gevonden' }, { status: 404 });
  }

  if (collection.user_id === user.id) {
    return NextResponse.json({ error: 'Je kunt je eigen collectie niet volgen' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collection_follows')
    .insert({ user_id: user.id, collection_id: id });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Je volgt deze collectie al' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Send notification (fire-and-forget) ──
  const collectionId = id;
  (async () => {
    try {
      const { data: col } = await supabaseAdmin
        .from('collections').select('user_id, title').eq('id', collectionId).single();
      const { data: actorProfile } = await supabaseAdmin
        .from('profiles').select('display_name').eq('id', user.id).single();
      const actorName = actorProfile?.display_name || 'Iemand';

      if (col) {
        await createNotification({
          recipientId: col.user_id,
          actorId: user.id,
          type: 'collection_follow',
          message: `${actorName} volgt nu je collectie: ${col.title}`,
          link: `/collecties/${collectionId}`,
        });
      }
    } catch (err) {
      console.error('[Follow] Notification error:', err);
    }
  })();

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/collections/[id]/follow — unfollow a collection
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const { error } = await supabase
    .from('collection_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('collection_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
