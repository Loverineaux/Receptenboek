import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/collections/[id] — collection with all recipes
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data: collection, error } = await supabase
    .from('collections')
    .select(`
      *,
      user:profiles!collections_user_id_fkey(id, display_name, avatar_url),
      collection_recipes(
        sort_order,
        added_at,
        recipe:recipes(
          id, title, subtitle, image_url, bron, tijd, moeilijkheid, categorie, created_at,
          ingredients(naam),
          tags:recipe_tags(tag:tags(id, name)),
          ratings(sterren, user_id),
          comments(id)
        )
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !collection) {
    return NextResponse.json({ error: 'Collectie niet gevonden' }, { status: 404 });
  }

  // Process recipes
  const recipes = (collection.collection_recipes ?? [])
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((cr: any) => {
      const r = cr.recipe;
      if (!r) return null;
      const ratings = r.ratings ?? [];
      const avg = ratings.length > 0
        ? ratings.reduce((s: number, rt: any) => s + rt.sterren, 0) / ratings.length
        : null;
      return {
        ...r,
        tags: (r.tags ?? []).map((rt: any) => rt.tag).filter(Boolean),
        average_rating: avg,
        nutrition: null,
        steps: [],
      };
    })
    .filter(Boolean);

  // Fetch collaborators
  const { data: collabRows } = await supabase
    .from('collection_collaborators')
    .select('user_id, profiles:profiles!collection_collaborators_user_id_fkey(id, display_name, avatar_url)')
    .eq('collection_id', params.id);

  const collaborators = (collabRows ?? []).map((r: any) => r.profiles).filter(Boolean);

  // Follower count
  const { count: followerCount } = await supabase
    .from('collection_follows')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', params.id);

  // Check if current user follows / is collaborator
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let isFollowing = false;
  let isCollaborator = false;

  if (currentUser) {
    const { data: followRow } = await supabase
      .from('collection_follows')
      .select('user_id')
      .eq('collection_id', params.id)
      .eq('user_id', currentUser.id)
      .maybeSingle();
    isFollowing = !!followRow;

    isCollaborator = collaborators.some((c: any) => c.id === currentUser.id);
  }

  // Collection ratings
  const { data: ratingsData } = await supabase
    .from('collection_ratings')
    .select('sterren, user_id')
    .eq('collection_id', params.id);

  const ratings = ratingsData ?? [];
  const avgRating = ratings.length > 0
    ? ratings.reduce((s, r: any) => s + r.sterren, 0) / ratings.length
    : null;

  return NextResponse.json({
    ...collection,
    collection_recipes: undefined,
    recipes,
    recipe_count: recipes.length,
    preview_images: recipes.map((r: any) => r.image_url).filter(Boolean).slice(0, 4),
    collaborators,
    follower_count: followerCount ?? 0,
    is_following: isFollowing,
    is_collaborator: isCollaborator,
    average_rating: avgRating,
    rating_count: ratings.length,
    ratings,
  });
}

// PUT /api/collections/[id] — update title/description
export async function PUT(
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
  const { title, description } = body;

  const { data, error } = await supabase
    .from('collections')
    .update({
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/collections/[id]
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
    .from('collections')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
