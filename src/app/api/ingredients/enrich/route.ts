import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

async function searchOFF(query: string, limit = 5): Promise<OffNutrients[]> {
  try {
    const url = `${OFF_SEARCH}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=product_name,nutriments,brands&tagtype_0=countries&tag_contains_0=contains&tag_0=netherlands`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products || [])
      .map((p: any) => p.nutriments)
      .filter((n: any) => n && n['energy-kcal_100g'] != null && n['energy-kcal_100g'] > 0);
  } catch {
    return [];
  }
}

function avgField(items: OffNutrients[], field: keyof OffNutrients): number | null {
  const vals = items.map(n => n[field]).filter((v): v is number => v != null && v > 0);
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

      // Get all ingredients without nutrition
      const { data: ingredients } = await admin
        .from('generic_ingredients')
        .select('id, name')
        .is('avg_kcal', null)
        .order('name');

      const items = ingredients ?? [];
      send({ type: 'status', message: `${items.length} ingrediënten zonder voedingswaarden`, total: items.length });

      let enriched = 0;
      let skipped = 0;

      for (let i = 0; i < items.length; i++) {
        const ing = items[i];
        const searchTerm = SEARCH_OVERRIDES[ing.name] || ing.name;

        send({ type: 'processing', processed: i + 1, total: items.length, naam: ing.name });

        const results = await searchOFF(searchTerm);

        if (results.length > 0) {
          const update = {
            avg_kcal: avgField(results, 'energy-kcal_100g'),
            avg_protein: avgField(results, 'proteins_100g'),
            avg_fat: avgField(results, 'fat_100g'),
            avg_saturated_fat: avgField(results, 'saturated-fat_100g'),
            avg_carbs: avgField(results, 'carbohydrates_100g'),
            avg_sugars: avgField(results, 'sugars_100g'),
            avg_fiber: avgField(results, 'fiber_100g'),
            avg_salt: avgField(results, 'salt_100g'),
            product_count: results.length,
          };

          await admin.from('generic_ingredients').update(update).eq('id', ing.id);
          enriched++;
          send({ type: 'enriched', processed: i + 1, total: items.length, naam: ing.name, kcal: update.avg_kcal });
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
