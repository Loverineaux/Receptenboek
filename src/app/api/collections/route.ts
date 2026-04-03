import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/collections — list all collections with recipe count and preview images
export async function GET() {
  const supabase = createClient();

  const { data: collections, error } = await supabase
    .from('collections')
    .select(`
      *,
      user:profiles!collections_user_id_fkey(id, display_name, avatar_url),
      collection_recipes(
        recipe:recipes(id, image_url)
      ),
      collection_ratings(sterren)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if user is logged in for follow/collaborator flags
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let followedIds = new Set<string>();
  let collaboratorIds = new Set<string>();

  if (user) {
    const [{ data: follows }, { data: collabs }] = await Promise.all([
      supabase.from('collection_follows').select('collection_id').eq('user_id', user.id),
      supabase.from('collection_collaborators').select('collection_id').eq('user_id', user.id),
    ]);
    followedIds = new Set((follows ?? []).map((f: any) => f.collection_id));
    collaboratorIds = new Set((collabs ?? []).map((c: any) => c.collection_id));
  }

  const result = (collections ?? []).map((c: any) => {
    const recipes = c.collection_recipes ?? [];
    const ratings = c.collection_ratings ?? [];
    const avgRating = ratings.length > 0
      ? ratings.reduce((s: number, r: any) => s + r.sterren, 0) / ratings.length
      : null;
    return {
      id: c.id,
      user_id: c.user_id,
      title: c.title,
      description: c.description,
      image_url: c.image_url,
      created_at: c.created_at,
      updated_at: c.updated_at,
      user: c.user,
      recipe_count: recipes.length,
      preview_images: recipes
        .map((cr: any) => cr.recipe?.image_url)
        .filter(Boolean)
        .slice(0, 4),
      is_following: followedIds.has(c.id),
      is_collaborator: collaboratorIds.has(c.id),
      average_rating: avgRating,
      rating_count: ratings.length,
    };
  });

  return NextResponse.json(result);
}

// POST /api/collections — create new collection
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const body = await request.json();
  const { title, description } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
