import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const CATEGORY_TAGS = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch', 'Pasta', 'Salade', 'Soep', 'Dessert', 'Ontbijt', 'Lunch'];

async function categorizeRecipe(recipeId: string, title: string, ingredients: any[]): Promise<string[]> {
  const client = new Anthropic();

  const ingList = ingredients
    .map((i: any) => `- ${i.hoeveelheid || ''} ${i.eenheid || ''} ${i.naam || ''}`.trim())
    .filter(Boolean)
    .join('\n');

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

GERECHT TYPE — wijs toe wat past:
- "Pasta" = een pastagerecht (spaghetti, noedels, bami, penne, casarecce, fusilli, noodles, lasagne, cannelloni)
- "Salade" = een ECHTE salade met sla/bladgroente als basis
- "Soep" = een soep
- "Dessert" = een zoet nagerecht
- "Ontbijt" = een ontbijtgerecht
- "Lunch" = een LICHTE maaltijd (broodje, tosti, sandwich, wrap). GEEN warme maaltijden.

Antwoord ALLEEN als JSON array, bijv. ["Kip", "Pasta"]. Geen tekst.`
    }]
  });

  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('').trim();

  const rawMatch = text.match(/\[[\s\S]*\]/);
  if (!rawMatch) return [];
  const rawParsed = JSON.parse(rawMatch[0]);

  let rawCats: string[];
  if (rawParsed.length > 0 && typeof rawParsed[0] === 'object') {
    rawCats = rawParsed.flatMap((obj: any) => Object.values(obj).filter((v: any) => typeof v === 'string'));
  } else {
    rawCats = rawParsed.filter((c: any) => typeof c === 'string');
  }

  let cats = rawCats
    .map((c: string) => CATEGORY_TAGS.find((k) => k.toLowerCase() === c.trim().toLowerCase()))
    .filter(Boolean) as string[];

  // Enforce single protein
  const proteins = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch'];
  const proteinCats = cats.filter((c) => proteins.includes(c));
  if (proteinCats.length > 1) {
    const best = proteins.find((p) => proteinCats.includes(p));
    cats = cats.filter((c) => !proteins.includes(c) || c === best);
  }

  return cats;
}

// GET /api/recipes/recategorize?mode=missing|all — SSE stream
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get('mode') || 'missing';

  // Get recipes to process
  let recipes: any[];

  if (mode === 'all') {
    // All recipes
    const { data } = await supabaseAdmin
      .from('recipes')
      .select('id, title, ingredients(hoeveelheid, eenheid, naam)')
      .order('created_at', { ascending: false });
    recipes = data ?? [];
  } else {
    // Only recipes without category tags
    const { data: allRecipes } = await supabaseAdmin
      .from('recipes')
      .select('id, title, ingredients(hoeveelheid, eenheid, naam), recipe_tags(tag:tags(name))')
      .order('created_at', { ascending: false });

    recipes = (allRecipes ?? []).filter((r: any) => {
      const tagNames = (r.recipe_tags ?? []).map((rt: any) => rt.tag?.name?.toLowerCase()).filter(Boolean);
      const hasCategoryTag = tagNames.some((t: string) =>
        CATEGORY_TAGS.some((c) => c.toLowerCase() === t)
      );
      return !hasCategoryTag;
    });
  }

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: 'status', message: `${recipes.length} recepten gevonden om te categoriseren`, total: recipes.length });

      let processed = 0;
      let updated = 0;

      for (const recipe of recipes) {
        processed++;
        try {
          const cats = await categorizeRecipe(recipe.id, recipe.title, recipe.ingredients ?? []);

          if (cats.length > 0) {
            // Remove old category tags first (in 'all' mode)
            if (mode === 'all') {
              const { data: existingTags } = await supabaseAdmin
                .from('recipe_tags')
                .select('tag_id, tag:tags(name)')
                .eq('recipe_id', recipe.id);

              const catTagIds = (existingTags ?? [])
                .filter((rt: any) => CATEGORY_TAGS.some((c) => c.toLowerCase() === rt.tag?.name?.toLowerCase()))
                .map((rt: any) => rt.tag_id);

              if (catTagIds.length > 0) {
                await supabaseAdmin
                  .from('recipe_tags')
                  .delete()
                  .eq('recipe_id', recipe.id)
                  .in('tag_id', catTagIds);
              }
            }

            // Add new tags
            for (const cat of cats) {
              // Find existing tag (case-insensitive)
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
                  { recipe_id: recipe.id, tag_id: tag.id },
                  { onConflict: 'recipe_id,tag_id' }
                );
              }
            }
            updated++;
            send({ type: 'done_recipe', processed, title: recipe.title, cats, total: recipes.length });
          } else {
            send({ type: 'skip', processed, title: recipe.title, reason: 'Geen categorie bepaald', total: recipes.length });
          }
        } catch (err: any) {
          send({ type: 'error_recipe', processed, title: recipe.title, error: err.message, total: recipes.length });
        }
      }

      send({ type: 'complete', processed, updated, total: recipes.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
