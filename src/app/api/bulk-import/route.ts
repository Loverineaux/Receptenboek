import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { scrapePage, jsonLdToRecipe, detectBronFromUrl } from '@/lib/extraction/scrape';
import { cleanStepTitle, EXTRACTION_SYSTEM_PROMPT, parseRecipeResponse } from '@/lib/extraction/prompt';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

const CATEGORY_TAGS = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch', 'Pasta', 'Salade', 'Soep', 'Dessert', 'Ontbijt', 'Lunch'];

async function autoCategorize(recipeId: string, title: string, ingredients: any[]) {
  try {
    const client = new Anthropic();
    const ingList = ingredients
      .map((i: any) => `- ${i.hoeveelheid || ''} ${i.eenheid || ''} ${i.naam || ''}`.trim())
      .filter(Boolean)
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Categoriseer dit recept. Titel: "${title}"\nIngrediënten:\n${ingList || '(geen)'}\n\nKies uit: Kip, Vlees, Vis, Vegetarisch, Veganistisch, Pasta, Salade, Soep, Dessert, Ontbijt, Lunch.\nEIWIT: kies max 1 (Kip/Vlees/Vis/Vegetarisch/Veganistisch). NIET bij desserts/ontbijt/lunch/soep.\nAntwoord ALLEEN als JSON array, bijv. ["Vis", "Salade"].`
      }]
    });

    const text = response.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('').trim();
    const rawMatch = text.match(/\[.*\]/s);
    if (!rawMatch) return;
    const cats: string[] = JSON.parse(rawMatch[0])
      .filter((c: any) => typeof c === 'string')
      .map((c: string) => CATEGORY_TAGS.find((k) => k.toLowerCase() === c.trim().toLowerCase()))
      .filter(Boolean);

    // Enforce single protein
    const proteins = ['Kip', 'Vlees', 'Vis', 'Vegetarisch', 'Veganistisch'];
    const proteinCats = cats.filter((c) => proteins.includes(c));
    const finalCats = proteinCats.length > 1
      ? cats.filter((c) => !proteins.includes(c) || c === proteinCats[0])
      : cats;

    for (const cat of finalCats) {
      let { data: tag } = await supabaseAdmin.from('tags').select().ilike('name', cat).maybeSingle();
      if (!tag) {
        const { data: newTag } = await supabaseAdmin.from('tags').insert({ name: cat }).select().single();
        tag = newTag;
      }
      if (tag) {
        await supabaseAdmin.from('recipe_tags').upsert(
          { recipe_id: recipeId, tag_id: tag.id },
          { onConflict: 'recipe_id,tag_id' }
        );
      }
    }
    console.log(`[Bulk] Categorized: ${title} → ${finalCats.join(', ')}`);
  } catch (err: any) {
    console.error(`[Bulk] Categorize error for ${title}:`, err.message);
  }
}

/** Resolve short redirect URLs (e.g. ah.nl/r/123) to their final destination */
async function resolveUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    return res.url || url;
  } catch {
    // Manual redirect following for stubborn servers
    try {
      const res = await fetch(url, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      });
      const location = res.headers.get('location');
      if (location) {
        const resolved = location.startsWith('http') ? location : new URL(location, url).href;
        return resolveUrl(resolved);
      }
    } catch {}
    return url;
  }
}

export async function POST(request: NextRequest) {
  const { urls, user_id } = await request.json();

  if (!urls?.length || !user_id) {
    return NextResponse.json({ error: 'Missing urls or user_id' }, { status: 400 });
  }

  const results: { url: string; title: string; status: string; error?: string }[] = [];

  for (const url of urls) {
    try {
      // Resolve short URLs to full URLs first
      const resolvedUrl = await resolveUrl(url);
      console.log(`[Bulk] Scraping: ${url} → ${resolvedUrl}`);
      const scraped = await scrapePage(resolvedUrl);

      let recipe: any;
      if (scraped.jsonLd) {
        recipe = jsonLdToRecipe(scraped.jsonLd, scraped.ogImage);
      } else if (scraped.pageText && scraped.pageText.length > 200) {
        console.log(`[Bulk] No JSON-LD, using Claude on page text for: ${url}`);
        const client = new Anthropic();
        const imageInstruction = scraped.ogImage
          ? `\n\nDe afbeelding van dit recept is: ${scraped.ogImage} — gebruik dit als image_url.`
          : '';
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Hier is de tekst van een receptpagina (${url}):\n\n${scraped.pageText}${imageInstruction}\n\nRetourneer dit als een enkel JSON-object volgens het opgegeven schema. ALLEEN JSON, geen andere tekst.`,
          }],
        });
        const text = response.content.filter((b) => b.type === 'text').map((b) => (b as any).text).join('\n');
        recipe = parseRecipeResponse(text);
        if (!recipe.image_url && scraped.ogImage) recipe.image_url = scraped.ogImage;
      } else {
        throw new Error('Geen data gevonden (pagina geblokkeerd)');
      }

      if (!recipe.bron) recipe.bron = detectBronFromUrl(resolvedUrl) || detectBronFromUrl(url);

      // Clean step titles
      recipe.steps = (recipe.steps || []).map((s: any) => ({
        ...s,
        titel: cleanStepTitle(s.titel),
      }));

      // Insert recipe
      const { data: rec, error: recErr } = await supabaseAdmin
        .from('recipes')
        .insert({
          user_id,
          title: recipe.title,
          subtitle: recipe.subtitle || null,
          image_url: recipe.image_url || null,
          bron: recipe.bron || 'Albert Heijn',
          basis_porties: recipe.basis_porties ?? 2,
          tijd: recipe.tijd || null,
          moeilijkheid: recipe.moeilijkheid || 'Gemiddeld',
          is_public: false,
        })
        .select('id')
        .single();

      if (recErr || !rec) throw new Error(recErr?.message || 'Insert failed');

      const promises: PromiseLike<any>[] = [];

      // Ingredients
      if (recipe.ingredients?.length) {
        promises.push(
          supabaseAdmin.from('ingredients').insert(
            recipe.ingredients.map((ing: any, idx: number) => ({
              recipe_id: rec.id,
              hoeveelheid: ing.hoeveelheid || null,
              eenheid: ing.eenheid || null,
              naam: ing.naam,
              sort_order: idx,
            }))
          )
        );
      }

      // Steps
      if (recipe.steps?.length) {
        promises.push(
          supabaseAdmin.from('steps').insert(
            recipe.steps.map((s: any, idx: number) => ({
              recipe_id: rec.id,
              titel: s.titel || null,
              beschrijving: s.beschrijving,
              sort_order: idx,
            }))
          )
        );
      }

      // Nutrition
      if (recipe.nutrition) {
        promises.push(
          supabaseAdmin.from('nutrition').insert({
            recipe_id: rec.id,
            ...recipe.nutrition,
          })
        );
      }

      await Promise.all(promises);

      // Auto-categorize (adds tags)
      await autoCategorize(rec.id, recipe.title, recipe.ingredients || []);

      console.log(`[Bulk] OK: ${recipe.title}`);
      results.push({ url, title: recipe.title, status: 'ok' });
    } catch (err: any) {
      console.error(`[Bulk] FAIL: ${url} — ${err.message}`);
      results.push({ url, title: url, status: 'error', error: err.message });
    }
  }

  return NextResponse.json({ results });
}

// GET /api/bulk-import?categorize=missing — categorize recipes without tags
export async function GET(request: NextRequest) {
  const { data: allRecipes } = await supabaseAdmin
    .from('recipes')
    .select('id, title, ingredients(hoeveelheid, eenheid, naam), recipe_tags(tag:tags(name))')
    .order('created_at', { ascending: false });

  const needsCat = (allRecipes ?? []).filter((r: any) => {
    const tagNames = (r.recipe_tags ?? []).map((rt: any) => rt.tag?.name?.toLowerCase()).filter(Boolean);
    return !tagNames.some((t: string) => CATEGORY_TAGS.some((c) => c.toLowerCase() === t));
  });

  const results: { title: string; cats: string[] }[] = [];
  for (const r of needsCat) {
    await autoCategorize(r.id, r.title, r.ingredients ?? []);
    results.push({ title: r.title, cats: [] });
  }

  return NextResponse.json({ categorized: needsCat.length, results });
}
