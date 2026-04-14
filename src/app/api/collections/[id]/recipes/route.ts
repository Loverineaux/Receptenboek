import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/collections/[id]/recipes — add recipe to collection
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
  const { recipe_id } = body;

  if (!recipe_id) {
    return NextResponse.json({ error: 'recipe_id is verplicht' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collection_recipes')
    .insert({
      collection_id: id,
      recipe_id,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/collections/[id]/recipes — remove recipe from collection
export async function DELETE(
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
  const { recipe_id } = body;

  if (!recipe_id) {
    return NextResponse.json({ error: 'recipe_id is verplicht' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collection_recipes')
    .delete()
    .eq('collection_id', id)
    .eq('recipe_id', recipe_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
