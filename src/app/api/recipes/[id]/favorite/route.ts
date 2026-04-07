import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

// ────────────────────────────────────────────
// POST  /api/recipes/[id]/favorite
// ────────────────────────────────────────────
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

  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('recipe_id')
    .eq('recipe_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, message: 'Al als favoriet opgeslagen' });
  }

  const { error } = await supabase.from('favorites').insert({
    recipe_id: params.id,
    user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Send notification (fire-and-forget, don't block response) ──
  const recipeId = params.id;
  const actorId = user.id;
  (async () => {
    try {
      const { data: recipe } = await supabaseAdmin
        .from('recipes').select('user_id, title').eq('id', recipeId).single();
      const { data: actorProfile } = await supabaseAdmin
        .from('profiles').select('display_name').eq('id', actorId).single();
      const actorName = actorProfile?.display_name || 'Iemand';

      if (recipe) {
        await createNotification({
          recipientId: recipe.user_id,
          actorId,
          type: 'favorite',
          message: `${actorName} heeft ${recipe.title} als favoriet opgeslagen`,
          link: `/recepten/${recipeId}`,
        });
      }
    } catch (err) {
      console.error('[Favorite] Notification error:', err);
    }
  })();

  return NextResponse.json({ success: true }, { status: 201 });
}

// ────────────────────────────────────────────
// DELETE  /api/recipes/[id]/favorite
// ────────────────────────────────────────────
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
    .from('favorites')
    .delete()
    .eq('recipe_id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
