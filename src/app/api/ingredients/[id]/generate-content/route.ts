import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await params;

  // Fetch ingredient
  const { data: ingredient, error } = await supabaseAdmin
    .from('generic_ingredients')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !ingredient) {
    return new Response(JSON.stringify({ error: 'Ingrediënt niet gevonden' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller already closed
        }
      };

      // Timeout after 60 seconds
      const timeout = setTimeout(() => {
        send({ type: 'error', message: 'Het genereren duurde te lang. Probeer het opnieuw.' });
        try { controller.close(); } catch {}
      }, 60000);

      try {
        send({ type: 'status', message: `Informatie opzoeken over "${ingredient.name}"...` });

        // Step 1: Research with web search
        const researchResponse = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search',
              max_uses: 5,
            },
          ],
          system: 'Je bent een culinair expert. Genereer encyclopedische informatie over het ingrediënt. Schrijf in het Nederlands. Wees feitelijk en beknopt. Zoek actuele informatie op het web.',
          messages: [
            {
              role: 'user',
              content: `Zoek informatie op over het ingrediënt "${ingredient.name}" en geef een uitgebreid overzicht met:
- Een korte beschrijving (1-2 zinnen)
- Oorsprong / herkomst
- Gebruikstips in de keuken
- Bewaartips
- Seizoen (wanneer het het beste verkrijgbaar is, of "Jaarrond")
- Varianten / soorten
- Een leuk weetje
- Gewicht per stuk in gram (indien van toepassing, anders null)
- Gewicht per eetlepel in gram (indien van toepassing, anders null)
- Gewicht per theelepel in gram (indien van toepassing, anders null)

Geef alle informatie zo volledig en feitelijk mogelijk.`,
            },
          ],
        });

        send({ type: 'status', message: `Informatie structureren...` });

        const researchText = researchResponse.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as any).text)
          .join('\n');

        // Step 2: Structure as JSON
        const structureResponse = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: 'Je bent een data-assistent. Structureer de gegeven informatie als JSON. Antwoord ALLEEN met valid JSON, geen andere tekst.',
          messages: [
            {
              role: 'user',
              content: `Structureer de volgende informatie over "${ingredient.name}" als JSON met exact deze velden:

{
  "description": "korte beschrijving (1-2 zinnen)",
  "origin": "oorsprong/herkomst",
  "usage_tips": "gebruikstips in de keuken",
  "storage_tips": "bewaartips",
  "season": "seizoen of 'Jaarrond'",
  "variants": ["variant1", "variant2"],
  "fun_facts": "een leuk weetje",
  "gram_per_piece": null of een getal,
  "gram_per_el": null of een getal,
  "gram_per_tl": null of een getal
}

Informatie:
${researchText}

Antwoord ALLEEN met de JSON, geen markdown codeblocks of andere tekst.`,
            },
          ],
        });

        const structuredText = structureResponse.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as any).text)
          .join('')
          .trim();

        // Step 3: Parse JSON
        const jsonMatch = structuredText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          send({ type: 'error', message: 'Kon geen JSON-structuur herkennen in het antwoord.' });
          clearTimeout(timeout);
          try { controller.close(); } catch {}
          return;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        send({ type: 'status', message: `Opslaan...` });

        // Step 4: Save to database
        const updateData: Record<string, unknown> = {
          description: parsed.description ?? null,
          origin: parsed.origin ?? null,
          usage_tips: parsed.usage_tips ?? null,
          storage_tips: parsed.storage_tips ?? null,
          season: parsed.season ?? null,
          variants: parsed.variants ?? [],
          fun_facts: parsed.fun_facts ?? null,
          gram_per_piece: parsed.gram_per_piece ?? null,
          gram_per_el: parsed.gram_per_el ?? null,
          gram_per_tl: parsed.gram_per_tl ?? null,
          content_generated_at: new Date().toISOString(),
        };

        const { data: updated, error: updateError } = await supabaseAdmin
          .from('generic_ingredients')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          send({ type: 'error', message: `Fout bij opslaan: ${updateError.message}` });
        } else {
          send({ type: 'complete', ingredient: updated });
        }
      } catch (err: any) {
        send({ type: 'error', message: err.message || 'Onbekende fout bij het genereren van informatie' });
      } finally {
        clearTimeout(timeout);
        try { controller.close(); } catch {}
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
