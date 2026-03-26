import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ────────────────────────────────────────────
// GET  /api/recipes/[id]/comments
// ────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('comments')
    .select(
      '*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)'
    )
    .eq('recipe_id', params.id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data });
}

// ────────────────────────────────────────────
// POST  /api/recipes/[id]/comments
// ────────────────────────────────────────────
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

  const body = await request.json();

  if (!body.tekst?.trim()) {
    return NextResponse.json(
      { error: 'Reactie mag niet leeg zijn' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      recipe_id: params.id,
      user_id: user.id,
      body: body.tekst.trim(),
      parent_id: body.parent_id || null,
    })
    .select(
      '*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)'
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comment: data }, { status: 201 });
}
