import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

// POST /api/recipes/[id]/comments/like — like a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { comment_id } = await request.json();
  if (!comment_id) return NextResponse.json({ error: 'comment_id is verplicht' }, { status: 400 });

  const { error } = await supabase
    .from('comment_likes')
    .insert({ comment_id, user_id: user.id });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ success: true, message: 'Al geliked' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send notification to comment author (fire-and-forget)
  const recipeId = id;
  (async () => {
    try {
      const { data: comment } = await supabaseAdmin
        .from('comments').select('user_id').eq('id', comment_id).single();
      if (!comment) return;

      const { data: actorProfile } = await supabaseAdmin
        .from('profiles').select('display_name').eq('id', user.id).single();
      const actorName = actorProfile?.display_name || 'Iemand';

      const { data: recipe } = await supabaseAdmin
        .from('recipes').select('title').eq('id', recipeId).single();

      await createNotification({
        recipientId: comment.user_id,
        actorId: user.id,
        type: 'comment_like',
        message: `${actorName} vindt je reactie leuk${recipe ? ` bij ${recipe.title}` : ''}`,
        link: `/recepten/${recipeId}`,
      });
    } catch (err) {
      console.error('[CommentLike] Notification error:', err);
    }
  })();

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/recipes/[id]/comments/like — unlike a comment
export async function DELETE(
  request: NextRequest,
) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { comment_id } = await request.json();
  if (!comment_id) return NextResponse.json({ error: 'comment_id is verplicht' }, { status: 400 });

  await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', comment_id)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
