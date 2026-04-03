import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/collections/[id]/duplicate — duplicate a collection with a new title
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
  const { title } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });
  }

  // Fetch the source collection's recipes
  const { data: sourceRecipes, error: fetchError } = await supabase
    .from('collection_recipes')
    .select('recipe_id, sort_order')
    .eq('collection_id', params.id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Create the new collection
  const { data: newCollection, error: createError } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      title: title.trim(),
    })
    .select()
    .single();

  if (createError) {
    if (createError.code === '23505') {
      return NextResponse.json({ error: 'Er bestaat al een collectie met deze naam' }, { status: 409 });
    }
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Copy recipes to new collection
  if (sourceRecipes && sourceRecipes.length > 0) {
    const { error: copyError } = await supabase
      .from('collection_recipes')
      .insert(
        sourceRecipes.map((r: any) => ({
          collection_id: newCollection.id,
          recipe_id: r.recipe_id,
          sort_order: r.sort_order,
        }))
      );

    if (copyError) {
      return NextResponse.json({ error: copyError.message }, { status: 500 });
    }
  }

  return NextResponse.json(newCollection, { status: 201 });
}
