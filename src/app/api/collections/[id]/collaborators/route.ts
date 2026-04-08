import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

// GET /api/collections/[id]/collaborators
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('collection_collaborators')
    .select('user_id, created_at, profiles:profiles!collection_collaborators_user_id_fkey(id, display_name, avatar_url)')
    .eq('collection_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const collaborators = (data ?? []).map((r: any) => ({
    ...r.profiles,
    added_at: r.created_at,
  }));

  return NextResponse.json(collaborators);
}

// POST /api/collections/[id]/collaborators — add collaborator (owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // Verify ownership
  const { data: collection } = await supabase
    .from('collections')
    .select('user_id')
    .eq('id', params.id)
    .single();

  if (!collection || collection.user_id !== user.id) {
    return NextResponse.json({ error: 'Alleen de eigenaar kan sous-chefs toevoegen' }, { status: 403 });
  }

  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is verplicht' }, { status: 400 });
  }

  if (user_id === user.id) {
    return NextResponse.json({ error: 'Je kunt jezelf niet als sous-chef toevoegen' }, { status: 400 });
  }

  // Check max 10 collaborators
  const { count } = await supabase
    .from('collection_collaborators')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', params.id);

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Maximum van 10 sous-chefs bereikt' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collection_collaborators')
    .insert({
      collection_id: params.id,
      user_id,
      invited_by: user.id,
    });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Deze gebruiker is al sous-chef' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Send notification to invited user (fire-and-forget) ──
  const collectionId = params.id;
  (async () => {
    try {
      const { data: col } = await supabaseAdmin
        .from('collections').select('title').eq('id', collectionId).single();
      const { data: actorProfile } = await supabaseAdmin
        .from('profiles').select('display_name').eq('id', user.id).single();
      const actorName = actorProfile?.display_name || 'Iemand';

      await createNotification({
        recipientId: user_id,
        actorId: user.id,
        type: 'collection_invite',
        message: `${actorName} heeft je uitgenodigd als sous-chef voor: ${col?.title || 'een collectie'}`,
        link: `/collecties/${collectionId}`,
      });
    } catch (err) {
      console.error('[Collaborator] Notification error:', err);
    }
  })();

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/collections/[id]/collaborators — remove collaborator (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // Verify ownership
  const { data: collection } = await supabase
    .from('collections')
    .select('user_id')
    .eq('id', params.id)
    .single();

  if (!collection || collection.user_id !== user.id) {
    return NextResponse.json({ error: 'Alleen de eigenaar kan sous-chefs verwijderen' }, { status: 403 });
  }

  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is verplicht' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collection_collaborators')
    .delete()
    .eq('collection_id', params.id)
    .eq('user_id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
