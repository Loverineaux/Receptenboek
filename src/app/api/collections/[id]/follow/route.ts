import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/collections/[id]/follow — follow a collection
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  // Check collection exists and user is not the owner
  const { data: collection } = await supabase
    .from('collections')
    .select('user_id')
    .eq('id', params.id)
    .single();

  if (!collection) {
    return NextResponse.json({ error: 'Collectie niet gevonden' }, { status: 404 });
  }

  if (collection.user_id === user.id) {
    return NextResponse.json({ error: 'Je kunt je eigen collectie niet volgen' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collection_follows')
    .insert({ user_id: user.id, collection_id: params.id });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Je volgt deze collectie al' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/collections/[id]/follow — unfollow a collection
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const { error } = await supabase
    .from('collection_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('collection_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
