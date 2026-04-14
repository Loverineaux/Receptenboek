import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/collections/my-recipe-ids — returns set of recipe IDs in user's own + collaborated collections
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json([]);
  }

  // Get collections the user owns
  const { data: ownCollections } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id);

  // Get collections the user collaborates on
  const { data: collabCollections } = await supabase
    .from('collection_collaborators')
    .select('collection_id')
    .eq('user_id', user.id);

  const collectionIds = [
    ...(ownCollections ?? []).map((c: any) => c.id),
    ...(collabCollections ?? []).map((c: any) => c.collection_id),
  ];

  if (collectionIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: recipes } = await supabase
    .from('collection_recipes')
    .select('recipe_id')
    .in('collection_id', collectionIds);

  // Return unique recipe IDs
  const ids = Array.from(new Set((recipes ?? []).map((r: any) => r.recipe_id)));

  return NextResponse.json(ids);
}
