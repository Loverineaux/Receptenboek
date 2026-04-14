import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotificationForMany } from '@/lib/notifications';

// ────────────────────────────────────────────
// GET  /api/recipes/[id]/comments
// ────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .select(
      '*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)'
    )
    .eq('recipe_id', id)
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

  if (!body.tekst?.trim()) {
    return NextResponse.json(
      { error: 'Reactie mag niet leeg zijn' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      recipe_id: id,
      user_id: user.id,
      tekst: body.tekst.trim(),
      parent_id: body.parent_id || null,
    })
    .select(
      '*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)'
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Send notifications (fire-and-forget) ──
  const recipeId = id;
  (async () => {
    try {
      const { data: actorProfile } = await supabaseAdmin
        .from('profiles').select('display_name').eq('id', user.id).single();
      const actorName = actorProfile?.display_name || 'Iemand';

      const { data: recipe } = await supabaseAdmin
        .from('recipes').select('user_id, title').eq('id', recipeId).single();
      if (!recipe) return;

      // Notify recipe owner + all previous commenters (includes reply authors)
      const { data: previousComments } = await supabaseAdmin
        .from('comments')
        .select('user_id')
        .eq('recipe_id', recipeId);

      const recipientIds = new Set<string>();
      recipientIds.add(recipe.user_id); // recipe owner
      for (const c of previousComments ?? []) {
        recipientIds.add(c.user_id);
      }
      recipientIds.delete(user.id); // exclude actor

      if (recipientIds.size > 0) {
        await createNotificationForMany(
          Array.from(recipientIds),
          user.id,
          'comment',
          `${actorName} heeft een reactie geplaatst op: ${recipe.title}`,
          `/recepten/${recipeId}`,
        );
      }
    } catch (err) {
      console.error('[Comments] Notification error:', err);
    }
  })();

  return NextResponse.json({ comment: data }, { status: 201 });
}
