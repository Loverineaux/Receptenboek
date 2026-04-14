import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const body = await request.json();
  const sterren = body.sterren;

  if (sterren === 0) {
    await supabase.from('collection_ratings').delete()
      .eq('collection_id', id)
      .eq('user_id', user.id);
    return NextResponse.json({ success: true });
  }

  if (!sterren || sterren < 1 || sterren > 5) {
    return NextResponse.json(
      { error: 'Score moet tussen 1 en 5 liggen' },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('collection_ratings')
    .select('id')
    .eq('collection_id', id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('collection_ratings')
      .update({ sterren })
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from('collection_ratings').insert({
      collection_id: id,
      user_id: user.id,
      sterren,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
