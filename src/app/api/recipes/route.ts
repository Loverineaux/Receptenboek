import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const CATEGORY_TAGS = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch', 'Pasta', 'Salade', 'Soep', 'Dessert', 'Ontbijt', 'Lunch'];

async function autoCategorize(recipeId: string, title: string, ingredients: any[]) {
  const client = new Anthropic();

  const ingList = ingredients
    .map((i: any) => `- ${i.hoeveelheid || ''} ${i.eenheid || ''} ${i.naam || ''}`.trim())
    .filter(Boolean)
    .join('\n');

  console.log(`[Auto-categorize] ${title}`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Je bent een ervaren kok. Categoriseer dit recept op basis van je culinaire kennis.

Titel: "${title}"
Ingrediënten:
${ingList || '(geen)'}

EIWIT — kies PRECIES ÉÉN op basis van titel + ingrediënten. Analyseer BEIDE!
BELANGRIJK: wijs GEEN eiwit-categorie toe bij desserts, ontbijt, lunch of soepen. Eiwit is alleen relevant voor warme hoofd-/bijgerechten.
- "Kip" = bevat kip/chicken/kipfilet/kippendij/kipgehakt/kippenpoot/drumstick
- "Vlees" = bevat rood vlees of gehakt (biefstuk, rundergehakt, gehakt, worst, boerenworst, spek, bacon, ossenhaas, filet americain, rosbief, hamburger, bifteki, köfte, lam, lamsvlees, varkenshaas, ribs, pulled pork, chorizo, salami, prosciutto, shoarma). Carbonara = spek = Vlees. BBQ met gehakt = Vlees. NIET kip.
- "Vis" = bevat vis of zeevruchten (zalm, tonijn, garnaal, gamba's, kabeljauw, koolvis, pangasius, forel, makreel, haring, sardines, mosselen, calamaris, scampi, kreeft, sushi). OOK als vis alleen in de titel staat (bijv. "met zalm", "tonijnsalade").
- "Vegetarisch" = GEEN vlees, kip of vis aanwezig. Ei/kaas/zuivel mag. NIET toewijzen bij desserts/ontbijt/lunch/soepen.
- "Veganistisch" = GEEN dierlijke producten. NIET toewijzen bij desserts/ontbijt/lunch/soepen.

GERECHT TYPE — wijs toe wat past. Denk als een kok: wat IS dit gerecht?
- "Pasta" = een pastagerecht (spaghetti, noedels, bami, penne, casarecce, fusilli, noodles, lasagne, cannelloni)
- "Salade" = een ECHTE salade met sla/bladgroente als basis. Broodje tonijnsalade = GEEN salade.
- "Soep" = een soep
- "Dessert" = een zoet nagerecht of tussendoortje
- "Ontbijt" = een gerecht dat je bij het ontbijt eet: bowls, overnight oats, smoothie, yoghurt met toppings
- "Lunch" = een LICHTE maaltijd die je tussen de middag eet: broodje, tosti, sandwich, een simpele wrap met salade-vulling. GEEN complete warme maaltijden — een risotto, pizza, loempia, burrito met rijst, stamppot, ovenschotel, curry of ossenhaas is een DINER, geen lunch. Bij twijfel: het is geen lunch.

Antwoord ALLEEN als JSON array, bijv. ["Kip", "Pasta"]. Geen tekst.`
    }]
  });

  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('').trim();

  let cats: string[];
  try {
    const rawMatch = text.match(/\[.*\]/s);
    if (!rawMatch) throw new Error('No JSON array found');
    const rawParsed = JSON.parse(rawMatch[0]);

    // Handle both ["Kip", "Pasta"] and [{"eiwit": "Kip", "type": "Pasta"}]
    let rawCats: string[];
    if (rawParsed.length > 0 && typeof rawParsed[0] === 'object') {
      rawCats = rawParsed.flatMap((obj: any) => Object.values(obj).filter((v: any) => typeof v === 'string'));
    } else {
      rawCats = rawParsed.filter((c: any) => typeof c === 'string');
    }

    cats = rawCats
      .map((c: string) => CATEGORY_TAGS.find((k) => k.toLowerCase() === c.trim().toLowerCase()))
      .filter(Boolean) as string[];
  } catch {
    console.error('[Auto-categorize] Parse error:', text.substring(0, 60));
    return;
  }

  // Enforce single protein
  const proteins = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch'];
  const proteinCats = cats.filter((c) => proteins.includes(c));
  if (proteinCats.length > 1) {
    const best = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch'].find((p) => proteinCats.includes(p));
    cats = cats.filter((c) => !proteins.includes(c) || c === best);
  }

  if (cats.length === 0) return;

  // Find or create tags and link (use admin client to bypass RLS)
  for (const cat of cats) {
    let { data: tag } = await supabaseAdmin
      .from('tags')
      .select()
      .ilike('name', cat)
      .maybeSingle();

    if (!tag) {
      const { data: newTag } = await supabaseAdmin
        .from('tags')
        .insert({ name: cat })
        .select()
        .single();
      tag = newTag;
    }

    if (tag) {
      await supabaseAdmin.from('recipe_tags').upsert(
        { recipe_id: recipeId, tag_id: tag.id },
        { onConflict: 'recipe_id,tag_id' }
      );
    }
  }

  console.log(`[Auto-categorize] ${title} → ${cats.join(', ')}`);
}

// ────────────────────────────────────────────
// GET  /api/recipes
// ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient();
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
    query = query.eq('bron', source);
  }

  // -- sorting --
  switch (sort) {
    case 'rating':
      query = query.order('created_at', { ascending: false }); // fallback; real rating sort done below
      break;
    case 'time':
      query = query.order('tijd', { ascending: true, nullsFirst: false });
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

  // Fetch favorite counts in bulk via admin (bypasses RLS)
  const recipeIds = (data ?? []).map((r: any) => r.id);
  const favCountMap: Record<string, number> = {};
  if (recipeIds.length > 0) {
    const { data: favRows } = await supabaseAdmin
      .from('favorites')
      .select('recipe_id')
      .in('recipe_id', recipeIds);
    for (const f of favRows ?? []) {
      favCountMap[f.recipe_id] = (favCountMap[f.recipe_id] || 0) + 1;
    }
  }

  // Post-process: compute average rating, flatten tags
  const recipes = (data ?? []).map((r: any) => {
    const ratings = r.ratings ?? [];
    const avg =
      ratings.length > 0
        ? ratings.reduce((sum: number, rt: any) => sum + rt.sterren, 0) / ratings.length
        : null;

    const flatTags = (r.tags ?? [])
      .map((rt: any) => rt.tag)
      .filter(Boolean);

    return {
      ...r,
      tags: flatTags,
      average_rating: avg,
      favorite_count: favCountMap[r.id] || 0,
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
  console.log('[POST /api/recipes] Start');
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  console.log('[POST /api/recipes] User:', user?.id ?? 'NONE');

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const body = await request.json();
  console.log('[POST /api/recipes] Body keys:', Object.keys(body));

  // Check for duplicates (skip if force=true)
  if (!body._force) {
    const duplicates: { id: string; title: string; image_url: string | null; bron: string | null; match_reason: string }[] = [];

    // 1. Check for same source/bron (exact URL match)
    if (body.bron && body.bron !== 'Eigen recept') {
      const { data: bronMatches } = await supabaseAdmin
        .from('recipes')
        .select('id, title, image_url, bron')
        .eq('bron', body.bron)
        .limit(3);
      for (const d of bronMatches ?? []) {
        if (!duplicates.find((x) => x.id === d.id)) {
          duplicates.push({ ...d, match_reason: 'Zelfde bron/website' });
        }
      }
    }

    // 2. Check for same image URL (exact match, skip base64)
    if (body.image_url && !body.image_url.startsWith('data:')) {
      const { data: imgMatches } = await supabaseAdmin
        .from('recipes')
        .select('id, title, image_url, bron')
        .eq('image_url', body.image_url)
        .limit(3);
      for (const d of imgMatches ?? []) {
        if (!duplicates.find((x) => x.id === d.id)) {
          duplicates.push({ ...d, match_reason: 'Zelfde afbeelding' });
        }
      }
    }

    // 3. Check for similar title (70% character overlap)
    if (body.title) {
      const { data: titleMatches } = await supabaseAdmin
        .from('recipes')
        .select('id, title, image_url, bron')
        .ilike('title', `%${body.title.substring(0, 30)}%`)
        .limit(5);

      for (const d of titleMatches ?? []) {
        if (duplicates.find((x) => x.id === d.id)) continue;
        const a = d.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const b = body.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const shorter = Math.min(a.length, b.length);
        if (shorter === 0) continue;
        let matches = 0;
        for (let i = 0; i < shorter; i++) {
          if (a[i] === b[i]) matches++;
        }
        if (matches / shorter > 0.7) {
          duplicates.push({ ...d, match_reason: 'Vergelijkbare titel' });
        }
      }
    }

    if (duplicates.length > 0) {
      return NextResponse.json({
        warning: 'duplicate',
        message: `Er ${duplicates.length === 1 ? 'bestaat al een vergelijkbaar recept' : `bestaan al ${duplicates.length} vergelijkbare recepten`}`,
        existing: duplicates,
      }, { status: 409 });
    }
  }

  // Upload base64 image to Storage if needed
  let imageUrl = body.image_url || null;
  if (imageUrl && imageUrl.startsWith('data:')) {
    try {
      const base64Data = imageUrl.split(',')[1];
      const mimeMatch = imageUrl.match(/data:(image\/\w+);/);
      const mime = mimeMatch?.[1] || 'image/jpeg';
      const ext = mime.split('/')[1] || 'jpg';
      const buffer = Buffer.from(base64Data, 'base64');
      const path = `recipes/${Date.now()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from('recipe-images')
        .upload(path, buffer, { contentType: mime, upsert: true });
      if (!upErr) {
        const { data: urlData } = supabaseAdmin.storage.from('recipe-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    } catch {
      imageUrl = null;
    }
  }

  // 1. Create recipe
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      title: body.title,
      subtitle: body.subtitle || null,
      image_url: imageUrl,
      bron: (body.bron && body.bron.trim()) || 'Eigen recept',
      basis_porties: body.basis_porties ?? 2,
      tijd: body.tijd || null,
      moeilijkheid: body.moeilijkheid || 'Gemiddeld',
      categorie: body.categorie || null,
      is_public: body.is_public ?? false,
      weetje: body.weetje || null,
      allergenen: body.allergenen || null,
      temperatuur: body.temperatuur || null,
      kerntemperatuur: body.kerntemperatuur || null,
    })
    .select()
    .single();

  console.log('[POST /api/recipes] Insert result:', recipeError ? `ERROR: ${recipeError.message}` : `OK id=${recipe?.id}`);

  if (recipeError || !recipe) {
    return NextResponse.json(
      { error: recipeError?.message ?? 'Kon recept niet aanmaken' },
      { status: 500 }
    );
  }

  const recipeId = recipe.id;

  // Run all inserts in parallel
  const promises: PromiseLike<any>[] = [];

  // Ingredients
  if (body.ingredients?.length) {
    console.log(`[POST /api/recipes] Inserting ${body.ingredients.length} ingredients`);
    const rows = body.ingredients.map((ing: any, idx: number) => ({
      recipe_id: recipeId,
      hoeveelheid: ing.hoeveelheid || null,
      eenheid: ing.eenheid || null,
      naam: ing.naam,
      sort_order: idx,
    }));
    promises.push(
      supabase.from('ingredients').insert(rows).then(({ error }) => {
        if (error) console.error('[POST /api/recipes] Ingredients error:', error.message);
        else console.log('[POST /api/recipes] Ingredients OK');
      })
    );
  }

  // Steps
  if (body.steps?.length) {
    console.log(`[POST /api/recipes] Inserting ${body.steps.length} steps`);
    const rows = body.steps.map((step: any, idx: number) => ({
      recipe_id: recipeId,
      titel: step.titel || null,
      beschrijving: step.beschrijving,
      afbeelding_url: step.afbeelding_url || null,
      sort_order: idx,
    }));
    promises.push(
      supabase.from('steps').insert(rows).then(({ error }) => {
        if (error) console.error('[POST /api/recipes] Steps error:', error.message);
        else console.log('[POST /api/recipes] Steps OK');
      })
    );
  }

  // Nutrition
  if (body.nutrition) {
    console.log('[POST /api/recipes] Inserting nutrition');
    const n = body.nutrition;
    promises.push(
      supabase.from('nutrition').insert({
        recipe_id: recipeId,
        energie_kcal: n.energie_kcal || null,
        energie_kj: n.energie_kj || null,
        vetten: n.vetten || null,
        verzadigd: n.verzadigd || null,
        koolhydraten: n.koolhydraten || null,
        suikers: n.suikers || null,
        vezels: n.vezels || null,
        eiwitten: n.eiwitten || null,
        zout: n.zout || null,
      }).then(({ error }) => {
        if (error) console.error('[POST /api/recipes] Nutrition error:', error.message);
        else console.log('[POST /api/recipes] Nutrition OK');
      })
    );
  }

  // Tags — find or create, then link
  if (body.tags?.length) {
    console.log(`[POST /api/recipes] Processing ${body.tags.length} tags`);
    promises.push(
      (async () => {
        const normalizedNames = body.tags.map((name: string) =>
          name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
        );

        // Batch lookup: fetch all existing tags in one query
        const { data: existingTags } = await supabaseAdmin
          .from('tags')
          .select('id, name');
        const tagNameMap = new Map(
          (existingTags ?? []).map((t: any) => [t.name.toLowerCase(), t.id])
        );

        const tagIds: string[] = [];
        const toCreate: string[] = [];
        for (const name of normalizedNames) {
          const existing = tagNameMap.get(name.toLowerCase());
          if (existing) {
            tagIds.push(existing);
          } else {
            toCreate.push(name);
          }
        }

        // Batch insert new tags in one query
        if (toCreate.length > 0) {
          const { data: newTags } = await supabaseAdmin
            .from('tags')
            .insert(toCreate.map((name) => ({ name })))
            .select('id');
          if (newTags) {
            tagIds.push(...newTags.map((t: any) => t.id));
          }
        }

        console.log(`[POST /api/recipes] Tags resolved: ${tagIds.length}`);

        if (tagIds.length) {
          const { error: linkError } = await supabaseAdmin.from('recipe_tags').insert(
            tagIds.map((tagId) => ({ recipe_id: recipeId, tag_id: tagId }))
          );
          if (linkError) console.error('[POST /api/recipes] recipe_tags error:', linkError.message);
          else console.log('[POST /api/recipes] recipe_tags OK');
        }
      })()
    );
  }

  // Benodigdheden
  if (body.benodigdheden?.length) {
    console.log(`[POST /api/recipes] Inserting ${body.benodigdheden.length} benodigdheden`);
    const rows = body.benodigdheden.map((naam: string) => ({
      recipe_id: recipeId,
      naam,
    }));
    promises.push(
      supabase.from('benodigdheden').insert(rows).then(({ error }) => {
        if (error) console.error('[POST /api/recipes] Benodigdheden error:', error.message);
        else console.log('[POST /api/recipes] Benodigdheden OK');
      })
    );
  }

  console.log(`[POST /api/recipes] Awaiting ${promises.length} parallel inserts...`);
  await Promise.all(promises);

  // Auto-categorize in the background (don't block the response)
  autoCategorize(recipeId, body.title, body.ingredients || []).catch((err) =>
    console.error('[POST /api/recipes] Auto-categorize error:', err.message)
  );

  console.log('[POST /api/recipes] All done, returning 201');

  return NextResponse.json({ recipe }, { status: 201 });
}
