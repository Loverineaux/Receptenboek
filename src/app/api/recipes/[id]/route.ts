import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/admin';

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
      ? ratings.reduce((sum: number, r: any) => sum + r.sterren, 0) / ratings.length
      : null;

  const flatTags = (data.tags ?? []).map((rt: any) => rt.tag).filter(Boolean);

  // Favorite count via admin (bypasses RLS)
  const { count: favoriteCount } = await supabaseAdmin
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', params.id);

  const recipe = {
    ...data,
    tags: flatTags,
    average_rating: avg,
    favorite_count: favoriteCount ?? 0,
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

  // Verify ownership (admin bypass)
  const admin = await isAdmin(supabase);
  if (!admin) {
    const { data: existing } = await supabase
      .from('recipes')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
    }
  }

  const body = await request.json();

  // Use admin client if user is admin (bypasses RLS for other users' recipes)
  const db = admin ? supabaseAdmin : supabase;

  // Check if this is a tags-only update
  const isTagsOnly = body.tags && !body.title && !body.ingredients && !body.steps;

  // 1. Update recipe fields (skip if tags-only)
  if (!isTagsOnly) {
    const { error: updateError } = await db
      .from('recipes')
      .update({
        title: body.title,
        subtitle: body.subtitle || null,
        image_url: body.image_url || null,
        bron: body.bron || 'Eigen recept',
        basis_porties: body.basis_porties ?? 2,
        tijd: body.tijd || null,
        moeilijkheid: body.moeilijkheid || 'Gemiddeld',
        categorie: body.categorie || null,
        is_public: body.is_public ?? false,
        weetje: body.weetje || null,
        allergenen: body.allergenen || null,
      })
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // 2. Replace ingredients (only if provided)
  if (body.ingredients !== undefined) {
    await db.from('ingredients').delete().eq('recipe_id', params.id);
    if (body.ingredients?.length) {
      const rows = body.ingredients.map((ing: any, idx: number) => ({
        recipe_id: params.id,
        hoeveelheid: ing.hoeveelheid || null,
        eenheid: ing.eenheid || null,
        naam: ing.naam,
        sort_order: idx,
      }));
      await db.from('ingredients').insert(rows);
    }
  }

  // 3. Replace steps (only if provided)
  if (body.steps !== undefined) {
    await db.from('steps').delete().eq('recipe_id', params.id);
    if (body.steps?.length) {
      const rows = body.steps.map((step: any, idx: number) => ({
        recipe_id: params.id,
        titel: step.titel || null,
        beschrijving: step.beschrijving,
        afbeelding_url: step.afbeelding_url || null,
        sort_order: idx,
      }));
      await db.from('steps').insert(rows);
    }
  }

  // 4. Replace nutrition (only if provided)
  if (body.nutrition !== undefined) {
    await db.from('nutrition').delete().eq('recipe_id', params.id);
    if (body.nutrition) {
      const n = body.nutrition;
      await db.from('nutrition').insert({
        recipe_id: params.id,
        energie_kcal: n.energie_kcal || null,
        energie_kj: n.energie_kj || null,
        vetten: n.vetten || null,
        verzadigd: n.verzadigd || null,
        koolhydraten: n.koolhydraten || null,
        suikers: n.suikers || null,
        vezels: n.vezels || null,
        eiwitten: n.eiwitten || null,
        zout: n.zout || null,
      });
    }
  }

  // 5. Replace tags (always use admin client — tags/recipe_tags have restrictive RLS)
  if (body.tags !== undefined) {
    await supabaseAdmin.from('recipe_tags').delete().eq('recipe_id', params.id);

    const tagNames: string[] = (body.tags ?? [])
      .map((t: any) => (typeof t === 'string' ? t : t?.name)?.trim())
      .filter(Boolean);

    for (const tagName of tagNames) {
      // Find existing tag
      let { data: tag } = await supabaseAdmin
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .maybeSingle();

      // Create if not exists
      if (!tag) {
        const { data: newTag } = await supabaseAdmin
          .from('tags')
          .insert({ name: tagName })
          .select('id')
          .single();
        tag = newTag;
      }

      // Link tag to recipe
      if (tag) {
        await supabaseAdmin
          .from('recipe_tags')
          .insert({ recipe_id: params.id, tag_id: tag.id });
      }
    }
  }

  // 6. Replace benodigdheden (only if provided)
  if (body.benodigdheden !== undefined) {
    await db.from('benodigdheden').delete().eq('recipe_id', params.id);
    if (body.benodigdheden?.length) {
      const rows = body.benodigdheden.map((naam: string) => ({
        recipe_id: params.id,
        naam,
      }));
      await db.from('benodigdheden').insert(rows);
    }
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

  const admin = await isAdmin(supabase);
  if (!admin) {
    const { data: existing } = await supabase
      .from('recipes')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
    }
  }

  // Use admin client if admin
  const db = admin ? supabaseAdmin : supabase;

  // Cascade deletes should be handled by DB foreign keys, but clean up just in case
  await db.from('ingredients').delete().eq('recipe_id', params.id);
  await db.from('steps').delete().eq('recipe_id', params.id);
  await db.from('nutrition').delete().eq('recipe_id', params.id);
  await db.from('recipe_tags').delete().eq('recipe_id', params.id);
  await db.from('ratings').delete().eq('recipe_id', params.id);
  await db.from('comments').delete().eq('recipe_id', params.id);
  await db.from('favorites').delete().eq('recipe_id', params.id);
  await db.from('benodigdheden').delete().eq('recipe_id', params.id);

  const { error } = await db.from('recipes').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
