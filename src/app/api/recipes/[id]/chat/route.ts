import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Geen berichten meegegeven' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch the recipe with all details
  const { data: recipe } = await supabase
    .from('recipes')
    .select(`
      title, subtitle, tijd, moeilijkheid, bron, basis_porties, categorie,
      ingredients(naam, hoeveelheid, eenheid, sort_order),
      steps(titel, beschrijving, sort_order),
      nutrition(energie_kcal, eiwitten, koolhydraten, vetten, vezels, suikers, verzadigd, zout),
      tags:recipe_tags(tag:tags(name))
    `)
    .eq('id', params.id)
    .single();

  if (!recipe) {
    return new Response(JSON.stringify({ error: 'Recept niet gevonden' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build recipe context
  const ingredients = (recipe.ingredients ?? [])
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((i: any) => [i.hoeveelheid, i.eenheid, i.naam].filter(Boolean).join(' '))
    .join('\n');

  const steps = (recipe.steps ?? [])
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s: any, idx: number) => `${idx + 1}. ${s.titel ? s.titel + ': ' : ''}${s.beschrijving}`)
    .join('\n');

  const tags = (recipe.tags ?? [])
    .map((rt: any) => rt.tag?.name)
    .filter(Boolean)
    .join(', ');

  const nutrition = recipe.nutrition?.[0] || recipe.nutrition;
  const nutritionText = nutrition
    ? `Voedingswaarden per portie: ${[
        nutrition.energie_kcal && `${nutrition.energie_kcal} kcal`,
        nutrition.eiwitten && `${nutrition.eiwitten}g eiwit`,
        nutrition.koolhydraten && `${nutrition.koolhydraten}g koolhydraten`,
        nutrition.vetten && `${nutrition.vetten}g vet`,
      ].filter(Boolean).join(', ')}`
    : '';

  const systemPrompt = `Je bent een behulpzame kookassistent. Je helpt de gebruiker met het recept "${recipe.title}".

RECEPT DETAILS:
Titel: ${recipe.title}
${recipe.subtitle ? `Beschrijving: ${recipe.subtitle}` : ''}
${recipe.tijd ? `Bereidingstijd: ${recipe.tijd}` : ''}
${recipe.basis_porties ? `Porties: ${recipe.basis_porties}` : ''}
${recipe.moeilijkheid ? `Moeilijkheid: ${recipe.moeilijkheid}` : ''}
${tags ? `Tags: ${tags}` : ''}

INGREDIËNTEN:
${ingredients || 'Geen ingrediënten beschikbaar'}

BEREIDINGSWIJZE:
${steps || 'Geen stappen beschikbaar'}

${nutritionText}

INSTRUCTIES:
- Antwoord altijd in het Nederlands
- Wees beknopt maar volledig
- Als de gebruiker vraagt over vervangingen, geef alternatieven die bij het gerecht passen. Let op de voedingswaarden: als het recept mager/licht is (weinig vet, calorieën), stel dan ook magere alternatieven voor. Behoud het dieetkarakter van het recept
- Als de gebruiker vraagt over schalen, reken de hoeveelheden voor ze uit
- Als de gebruiker vraagt over bewaren/invriezen, geef praktisch advies
- Verzin geen informatie — als je iets niet weet, zeg dat eerlijk
- Gebruik geen markdown headers (#), gebruik gewoon vetgedrukte tekst (**) voor nadruk
- Sluit ELK antwoord af met exact dit blok (op nieuwe regels):
---
- [vervolgvraag 1]
- [vervolgvraag 2]
- [vervolgvraag 3]
De vervolgvragen moeten logische opvolgers zijn van je antwoord, kort (max 6 woorden) en relevant voor dit recept.`;

  // Stream response via SSE
  const encoder = new TextEncoder();
  const client = new Anthropic();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        });

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
        );
      } finally {
        controller.close();
      }
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
