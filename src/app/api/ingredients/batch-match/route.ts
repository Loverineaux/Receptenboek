import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { matchIngredient } from '@/lib/ingredients/matcher';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // 1. Fetch all unlinked ingredients, select distinct naam
        const { data: rows, error } = await supabaseAdmin
          .from('ingredients')
          .select('naam')
          .is('generic_ingredient_id', null);

        if (error) {
          send({ type: 'error', message: error.message });
          controller.close();
          return;
        }

        // Get distinct names
        const uniqueNames = [...new Set(
          (rows ?? [])
            .map((r: any) => r.naam)
            .filter((n: string | null) => n && n.trim())
        )] as string[];

        const total = uniqueNames.length;
        send({ type: 'status', message: `${total} unieke ingrediënten gevonden zonder koppeling`, total });

        let processed = 0;
        let matched = 0;

        for (const naam of uniqueNames) {
          processed++;

          try {
            const genericId = await matchIngredient(naam, supabaseAdmin);

            if (genericId) {
              // Update ALL ingredient rows with this naam
              await supabaseAdmin
                .from('ingredients')
                .update({ generic_ingredient_id: genericId })
                .eq('naam', naam)
                .is('generic_ingredient_id', null);

              // Get the generic ingredient name for reporting
              const { data: generic } = await supabaseAdmin
                .from('generic_ingredients')
                .select('name')
                .eq('id', genericId)
                .single();

              matched++;
              send({
                type: 'matched',
                processed,
                total,
                naam,
                match_name: generic?.name ?? genericId,
              });
            } else {
              send({ type: 'skip', processed, total, naam });
            }
          } catch (err: any) {
            send({ type: 'skip', processed, total, naam });
          }
        }

        send({ type: 'complete', processed, matched, total });
      } catch (err: any) {
        send({ type: 'error', message: err.message || 'Onbekende fout' });
      }

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
