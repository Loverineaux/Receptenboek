import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const OFF_SEARCH = 'https://world.openfoodfacts.net/cgi/search.pl';
const UA = 'Receptenboek/1.0 (https://github.com/Loverineaux/Receptenboek)';

// Search terms per ingredient for better OFF results
const SEARCH_OVERRIDES: Record<string, string> = {
  'ei': 'kippenei heel',
  'room': 'slagroom',
  'geraspte kaas': 'geraspte kaas goudse',
  'sla': 'ijsbergsla',
  'mais': 'suikermaïs',
  'tuinerwt': 'doperwten',
  'bloem': 'tarwebloem patent',
  'brood': 'brood volkoren',
  'panko': 'paneermeel',
  'peper': 'zwarte peper gemalen',
  'zout': 'zeezout',
};

interface OffNutrients {
  'energy-kcal_100g'?: number;
  'proteins_100g'?: number;
  'fat_100g'?: number;
  'saturated-fat_100g'?: number;
  'carbohydrates_100g'?: number;
  'sugars_100g'?: number;
  'fiber_100g'?: number;
  'salt_100g'?: number;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  product_quantity?: string;
  nutriments: OffNutrients;
}

const anthropic = new Anthropic();

/** Search OFF and return raw results with nutrition */
async function searchOFF(query: string, limit = 10): Promise<OffProduct[]> {
  try {
    const url = `${OFF_SEARCH}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,brands,image_url,image_front_url,product_quantity,nutriments&tagtype_0=countries&tag_contains_0=contains&tag_0=netherlands`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products || [])
      .filter((p: any) => p.nutriments?.['energy-kcal_100g'] != null && p.nutriments['energy-kcal_100g'] > 0);
  } catch {
    return [];
  }
}

/** Use AI to determine which products actually ARE the ingredient */
async function filterProductsWithAI(ingredientName: string, products: OffProduct[]): Promise<OffProduct[]> {
  if (products.length === 0) return [];

  const productList = products.map((p, i) =>
    `${i}: "${p.product_name}" (${p.brands || 'geen merk'})`
  ).join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Ik zoek het PURE ingrediënt "${ingredientName}". Welke van deze supermarktproducten bevatten ALLEEN dat ingrediënt (puur, rauw, gedroogd, of gemalen)?

${productList}

STRENG afwijzen:
- Kaas met smaak (bijv. "Komijn jong" = komijnenkaas, "Gouda komijn" = kaas) → AFWIJZEN
- Sauzen, dressings, kant-en-klare maaltijden → AFWIJZEN
- Producten waar "${ingredientName}" een smaak/toevoeging is → AFWIJZEN

ALLEEN accepteren als het product letterlijk ${ingredientName} IS (bijv. zakje komijnpoeder, pot gemalen komijn).

Antwoord ALLEEN als JSON array met nummers, bijv. [0, 2]. Lege array [] als geen enkel product past.`
      }],
    });

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
    const match = text.match(/\[[\d,\s]*\]/);
    if (!match) return [];
    const indices: number[] = JSON.parse(match[0]);
    return indices.filter(i => i >= 0 && i < products.length).map(i => products[i]);
  } catch {
    return [];
  }
}

function avgField(items: OffProduct[], field: keyof OffNutrients): number | null {
  const vals = items.map(p => p.nutriments[field]).filter((v): v is number => v != null && v > 0);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// POST /api/ingredients/enrich — fetch nutrition from OFF for all ingredients without data
export async function POST(request: NextRequest) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Check if force mode (re-enrich all, including those with data)
      const url = new URL(request.url);
      const force = url.searchParams.get('force') === '1';

      // Get ingredients to enrich
      let query = admin.from('generic_ingredients').select('id, name').order('name');
      if (!force) query = query.is('avg_kcal', null);
      const { data: ingredients } = await query;

      const items = ingredients ?? [];
      send({ type: 'status', message: `${items.length} ingrediënten zonder voedingswaarden`, total: items.length });

      let enriched = 0;
      let skipped = 0;

      for (let i = 0; i < items.length; i++) {
        const ing = items[i];
        const searchTerm = SEARCH_OVERRIDES[ing.name] || ing.name;

        send({ type: 'processing', processed: i + 1, total: items.length, naam: ing.name });

        const rawResults = await searchOFF(searchTerm);
        const results = await filterProductsWithAI(ing.name, rawResults);

        if (results.length > 0) {
          // Save individual products
          let savedProducts = 0;
          for (const p of results) {
            const barcode = p.code || `off-${ing.name}-${savedProducts}`;
            // Skip if barcode already exists
            const { data: exists } = await admin.from('products').select('id').eq('barcode', barcode).maybeSingle();
            if (!exists) {
              const n = p.nutriments;
              await admin.from('products').insert({
                barcode,
                product_name: p.product_name || ing.name,
                brand: p.brands || null,
                image_url: p.image_url || p.image_front_url || null,
                weight_grams: p.product_quantity ? parseFloat(p.product_quantity) || null : null,
                generic_ingredient_id: ing.id,
                kcal: n['energy-kcal_100g'] ?? null,
                protein: n['proteins_100g'] ?? null,
                fat: n['fat_100g'] ?? null,
                saturated_fat: n['saturated-fat_100g'] ?? null,
                carbs: n['carbohydrates_100g'] ?? null,
                sugars: n['sugars_100g'] ?? null,
                fiber: n['fiber_100g'] ?? null,
                salt: n['salt_100g'] ?? null,
                source: 'open_food_facts',
              });
              savedProducts++;
            }
          }

          // Recalculate averages from all linked products
          await admin.rpc('recalculate_generic_nutrition', { ingredient_id: ing.id });

          enriched++;
          const avgKcal = avgField(results, 'energy-kcal_100g');
          send({ type: 'enriched', processed: i + 1, total: items.length, naam: ing.name, kcal: avgKcal, products: savedProducts });
        } else {
          skipped++;
          send({ type: 'skip', processed: i + 1, total: items.length, naam: ing.name });
        }

        // Rate limit: ~200ms between requests to be nice to OFF
        await new Promise(r => setTimeout(r, 200));
      }

      send({ type: 'complete', enriched, skipped, total: items.length });
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
