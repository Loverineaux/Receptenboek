import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const body = await request.json();
  const sterren = body.sterren;

  if (sterren === 0) {
    // Delete rating
    await supabase.from('ratings').delete()
      .eq('recipe_id', id)
      .eq('user_id', user.id);
    return NextResponse.json({ success: true });
  }

  if (!sterren || sterren < 1 || sterren > 5) {
    return NextResponse.json(
      { error: 'Score moet tussen 1 en 5 liggen' },
      { status: 400 }
    );
  }

  // Upsert: one rating per user per recipe
  const { data: existing } = await supabase
    .from('ratings')
    .select('id')
    .eq('recipe_id', id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('ratings')
      .update({ sterren })
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from('ratings').insert({
      recipe_id: id,
      user_id: user.id,
      sterren,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // ── Send notification on first rating (fire-and-forget) ──
  if (!existing) {
    const recipeId = id;
    (async () => {
      try {
        const { data: recipe } = await supabaseAdmin
          .from('recipes').select('user_id, title').eq('id', recipeId).single();
        const { data: actorProfile } = await supabaseAdmin
          .from('profiles').select('display_name').eq('id', user.id).single();
        const actorName = actorProfile?.display_name || 'Iemand';

        if (recipe) {
          await createNotification({
            recipientId: recipe.user_id,
            actorId: user.id,
            type: 'rating',
            message: `${actorName} heeft ${recipe.title} beoordeeld met ${sterren} ${sterren === 1 ? 'ster' : 'sterren'}`,
            link: `/recepten/${recipeId}`,
          });
        }
      } catch (err) {
        console.error('[Rating] Notification error:', err);
      }
    })();
  }

  return NextResponse.json({ success: true });
}
