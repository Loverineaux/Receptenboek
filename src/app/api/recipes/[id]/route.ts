import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ────────────────────────────────────────────
// GET  /api/recipes/[id]
// ────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('recipes')
    .select(
      `
      *,
      ingredients(*, order:sort_order),
      steps(*, order:sort_order),
      tags:recipe_tags(tag:tags(*)),
      nutrition(*),
      ratings(*),
      comments(*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)),
      user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
    `
    )
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Flatten
  const ratings = data.ratings ?? [];
  const avg =
    ratings.length > 0
      ? ratings.reduce((sum: number, r: any) => sum + r.score, 0) / ratings.length
      : null;

  const flatTags = (data.tags ?? []).map((rt: any) => rt.tag).filter(Boolean);

  const recipe = {
    ...data,
    tags: flatTags,
    average_rating: avg,
    nutrition: Array.isArray(data.nutrition)
      ? data.nutrition[0] ?? null
      : data.nutrition,
    ingredients: (data.ingredients ?? []).sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
    steps: (data.steps ?? []).sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
  };

  return NextResponse.json({ recipe });
}

// ────────────────────────────────────────────
// PUT  /api/recipes/[id]
// ────────────────────────────────────────────
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

  // Verify ownership
  const { data: existing } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', params.id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const body = await request.json();

  // 1. Update recipe
  const { error: updateError } = await supabase
    .from('recipes')
    .update({
      title: body.title,
      slug: body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      description: body.description || null,
      image_url: body.image_url || null,
      source: body.source || 'Eigen recept',
      source_url: body.source_url || null,
      servings: body.servings ?? 4,
      prep_time_minutes: body.prep_time_minutes ?? null,
      cook_time_minutes: body.cook_time_minutes ?? null,
      total_time_minutes: body.total_time_minutes ?? null,
      difficulty: body.difficulty || 'Gemiddeld',
      is_public: body.is_public ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 2. Replace ingredients
  await supabase.from('ingredients').delete().eq('recipe_id', params.id);
  if (body.ingredients?.length) {
    const rows = body.ingredients.map((ing: any, idx: number) => ({
      recipe_id: params.id,
      hoeveelheid: ing.hoeveelheid,
      eenheid: ing.eenheid,
      naam: ing.naam,
      sort_order: idx,
    }));
    await supabase.from('ingredients').insert(rows);
  }

  // 3. Replace steps
  await supabase.from('steps').delete().eq('recipe_id', params.id);
  if (body.steps?.length) {
    const rows = body.steps.map((step: any, idx: number) => ({
      recipe_id: params.id,
      titel: step.titel,
      beschrijving: step.beschrijving,
      afbeelding_url: step.afbeelding_url,
      sort_order: idx,
    }));
    await supabase.from('steps').insert(rows);
  }

  // 4. Replace nutrition
  await supabase.from('nutrition').delete().eq('recipe_id', params.id);
  if (body.nutrition) {
    const n = body.nutrition;
    await supabase.from('nutrition').insert({
      recipe_id: params.id,
      calories: n.calories ? parseFloat(n.calories) : null,
      protein_grams: n.protein_grams ? parseFloat(n.protein_grams) : null,
      carbs_grams: n.carbs_grams ? parseFloat(n.carbs_grams) : null,
      fat_grams: n.fat_grams ? parseFloat(n.fat_grams) : null,
      fiber_grams: n.fiber_grams ? parseFloat(n.fiber_grams) : null,
      sugar_grams: n.sugar_grams ? parseFloat(n.sugar_grams) : null,
      sodium_mg: n.sodium_mg ? parseFloat(n.sodium_mg) : null,
    });
  }

  // 5. Replace tags
  await supabase.from('recipe_tags').delete().eq('recipe_id', params.id);
  if (body.tags?.length) {
    for (const tagName of body.tags) {
      const slug = tagName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { data: tag } = await supabase
        .from('tags')
        .upsert({ name: tagName, slug }, { onConflict: 'slug' })
        .select()
        .single();

      if (tag) {
        await supabase
          .from('recipe_tags')
          .insert({ recipe_id: params.id, tag_id: tag.id });
      }
    }
  }

  // 6. Replace benodigdheden
  await supabase.from('benodigdheden').delete().eq('recipe_id', params.id);
  if (body.benodigdheden?.length) {
    const rows = body.benodigdheden.map((naam: string) => ({
      recipe_id: params.id,
      naam,
    }));
    await supabase.from('benodigdheden').insert(rows);
  }

  return NextResponse.json({ success: true });
}

// ────────────────────────────────────────────
// DELETE  /api/recipes/[id]
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

  const { data: existing } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', params.id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  // Cascade deletes should be handled by DB foreign keys, but clean up just in case
  await supabase.from('ingredients').delete().eq('recipe_id', params.id);
  await supabase.from('steps').delete().eq('recipe_id', params.id);
  await supabase.from('nutrition').delete().eq('recipe_id', params.id);
  await supabase.from('recipe_tags').delete().eq('recipe_id', params.id);
  await supabase.from('ratings').delete().eq('recipe_id', params.id);
  await supabase.from('comments').delete().eq('recipe_id', params.id);
  await supabase.from('favorites').delete().eq('recipe_id', params.id);
  await supabase.from('benodigdheden').delete().eq('recipe_id', params.id);

  const { error } = await supabase.from('recipes').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
