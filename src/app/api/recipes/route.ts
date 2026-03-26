import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ────────────────────────────────────────────
// GET  /api/recipes
// ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const source = searchParams.get('source') || '';
  const tag = searchParams.get('tag') || '';
  const sort = searchParams.get('sort') || 'newest';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  let query = supabase
    .from('recipes')
    .select(
      `
      *,
      ingredients(*),
      steps(*),
      tags:recipe_tags(tag:tags(*)),
      nutrition(*),
      ratings(*),
      user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
    `,
      { count: 'exact' }
    );

  // -- filters --
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  if (source) {
    query = query.eq('source', source);
  }

  // -- sorting --
  switch (sort) {
    case 'rating':
      query = query.order('created_at', { ascending: false }); // fallback; real rating sort done below
      break;
    case 'time':
      query = query.order('total_time_minutes', { ascending: true, nullsFirst: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Post-process: compute average rating, flatten tags
  const recipes = (data ?? []).map((r: any) => {
    const ratings = r.ratings ?? [];
    const avg =
      ratings.length > 0
        ? ratings.reduce((sum: number, rt: any) => sum + rt.score, 0) / ratings.length
        : null;

    const flatTags = (r.tags ?? [])
      .map((rt: any) => rt.tag)
      .filter(Boolean);

    return {
      ...r,
      tags: flatTags,
      average_rating: avg,
      nutrition: Array.isArray(r.nutrition) ? r.nutrition[0] ?? null : r.nutrition,
    };
  });

  // If sorting by rating, sort in-memory
  if (sort === 'rating') {
    recipes.sort(
      (a: any, b: any) => (b.average_rating ?? 0) - (a.average_rating ?? 0)
    );
  }

  return NextResponse.json({ recipes, total: count });
}

// ────────────────────────────────────────────
// POST  /api/recipes
// ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const body = await request.json();

  // 1. Create recipe
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
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
    })
    .select()
    .single();

  if (recipeError || !recipe) {
    return NextResponse.json(
      { error: recipeError?.message ?? 'Kon recept niet aanmaken' },
      { status: 500 }
    );
  }

  const recipeId = recipe.id;

  // 2. Ingredients
  if (body.ingredients?.length) {
    const rows = body.ingredients.map((ing: any, idx: number) => ({
      recipe_id: recipeId,
      hoeveelheid: ing.hoeveelheid,
      eenheid: ing.eenheid,
      naam: ing.naam,
      sort_order: idx,
    }));
    await supabase.from('ingredients').insert(rows);
  }

  // 3. Steps
  if (body.steps?.length) {
    const rows = body.steps.map((step: any, idx: number) => ({
      recipe_id: recipeId,
      titel: step.titel,
      beschrijving: step.beschrijving,
      afbeelding_url: step.afbeelding_url,
      sort_order: idx,
    }));
    await supabase.from('steps').insert(rows);
  }

  // 4. Nutrition
  if (body.nutrition) {
    const n = body.nutrition;
    await supabase.from('nutrition').insert({
      recipe_id: recipeId,
      calories: n.calories ? parseFloat(n.calories) : null,
      protein_grams: n.protein_grams ? parseFloat(n.protein_grams) : null,
      carbs_grams: n.carbs_grams ? parseFloat(n.carbs_grams) : null,
      fat_grams: n.fat_grams ? parseFloat(n.fat_grams) : null,
      fiber_grams: n.fiber_grams ? parseFloat(n.fiber_grams) : null,
      sugar_grams: n.sugar_grams ? parseFloat(n.sugar_grams) : null,
      sodium_mg: n.sodium_mg ? parseFloat(n.sodium_mg) : null,
    });
  }

  // 5. Tags (upsert tag by name, then link)
  if (body.tags?.length) {
    for (const tagName of body.tags) {
      const slug = tagName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Upsert tag
      const { data: tag } = await supabase
        .from('tags')
        .upsert({ name: tagName, slug }, { onConflict: 'slug' })
        .select()
        .single();

      if (tag) {
        await supabase
          .from('recipe_tags')
          .insert({ recipe_id: recipeId, tag_id: tag.id });
      }
    }
  }

  // 6. Benodigdheden
  if (body.benodigdheden?.length) {
    const rows = body.benodigdheden.map((naam: string) => ({
      recipe_id: recipeId,
      naam,
    }));
    await supabase.from('benodigdheden').insert(rows);
  }

  return NextResponse.json({ recipe }, { status: 201 });
}
