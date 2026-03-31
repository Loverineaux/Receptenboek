import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

function buildAiPrompt(bron: string | null) {
  return `Je bent een gespecialiseerde receptextractor. Je krijgt tekst uit een PDF met recepten.

TAAK: Vind ALLE recepten in de tekst en retourneer ze als een JSON array.

REGELS:
- Alle tekst moet in het Nederlands zijn. Vertaal indien nodig.
- Elk recept moet minstens een naam en ingrediënten hebben.
- Sla pagina's over die geen recepten bevatten (inhoudsopgave, inleiding, etc).
- ${bron ? `De bron is "${bron}".` : "Detecteer de bron uit de tekst."}
- Retourneer UITSLUITEND een JSON array.

INGREDIËNTEN — BELANGRIJK:
- Geef hoeveelheid, eenheid en naam ALTIJD apart.
- Bij telbare items ZONDER eenheid, gebruik "stuks": "4 tomaten" → hoeveelheid: "4", eenheid: "stuks", naam: "tomaten"
- "2 uien" → hoeveelheid: "2", eenheid: "stuks", naam: "uien"
- "1 kaneelstokje" → hoeveelheid: "1", eenheid: "stuks", naam: "kaneelstokje"
- "200 gram kipfilet" → hoeveelheid: "200", eenheid: "gram", naam: "kipfilet"
- "3 eetlepels ketjap" → hoeveelheid: "3", eenheid: "eetlepels", naam: "ketjap"
- "Olie" (geen hoeveelheid) → hoeveelheid: null, eenheid: null, naam: "olie"
- Als ingrediënten in SECTIES staan (bijv. "Voor de dressing:", "Voor de marinade:"), gebruik dan het "groep" veld.
- Geef het PAGINANUMMER mee waarop het recept staat (voor image-koppeling).

TEMPERATUUR:
- Als er een temperatuur vermeld staat (oven, BBQ, airfryer), zet die in het "temperatuur" veld.

Schema per recept:
{
  "title": "string",
  "subtitle": "string | null (introductie/beschrijving)",
  "tijd": "string | null (bijv. '25 min')",
  "temperatuur": "string | null (bijv. '180°C', 'BBQ 130°C')",
  "bron": "${bron || "string | null"}",
  "basis_porties": "number | null",
  "page_number": "number | null (paginanummer in de PDF)",
  "ingredients": [{"hoeveelheid": "string | null", "eenheid": "string | null", "naam": "string", "groep": "string | null"}],
  "steps": [{"titel": "string | null", "beschrijving": "string"}],
  "nutrition": {"energie_kcal":"string|null","vetten":"string|null","koolhydraten":"string|null","eiwitten":"string|null"} | null,
  "tags": ["string"] | null
}`;
}

async function processBatch(
  client: Anthropic,
  batch: { pageNum: number; text: string }[],
  bron: string | null
): Promise<any[]> {
  const pageText = batch
    .map((p) => `--- PAGINA ${p.pageNum} ---\n${p.text}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: buildAiPrompt(bron),
    messages: [{ role: "user", content: `Vind alle recepten:\n\n${pageText}` }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  let jsonStr = text.trim();
  const m = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (m) jsonStr = m[1].trim();
  if (!jsonStr.startsWith("[")) {
    const am = jsonStr.match(/\[[\s\S]*\]/);
    if (am) jsonStr = am[0];
  }

  const parsed = JSON.parse(jsonStr);
  const recipes = Array.isArray(parsed) ? parsed : [parsed];
  return recipes.filter((r: any) => r.title && r.ingredients?.length > 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pages, images, filename, bron: userBron } = body;

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return Response.json({ error: "Geen pagina-teksten ontvangen" }, { status: 400 });
    }

    // Detect bron from filename or user input
    let bron = userBron || null;
    if (!bron && filename) {
      const fn = filename.toLowerCase();
      if (fn.includes("broodje") && fn.includes("dunner")) bron = "Broodje Dunner";
      else if (fn.includes("hellofresh")) bron = "HelloFresh";
      else if (fn.includes("jumbo")) bron = "Jumbo";
    }

    console.log(`[PDF Extract] ${pages.length} pages, bron: ${bron || 'auto'}`);

    // Build page image map
    const pageImageMap = new Map<number, string>();
    if (Array.isArray(images)) {
      images.forEach((img: string | null, idx: number) => {
        if (img && pages[idx]) {
          pageImageMap.set(pages[idx].pageNum || idx + 1, img);
        }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          const client = new Anthropic();
          const PAGES_PER_BATCH = 8;
          const MAX_CONCURRENT = 2;

          // Build batches with page numbers
          const pageData = pages.map((text: string, idx: number) => ({
            pageNum: idx + 1,
            text: typeof text === 'string' ? text : text.text || '',
          }));

          const batches: typeof pageData[] = [];
          for (let i = 0; i < pageData.length; i += PAGES_PER_BATCH) {
            batches.push(pageData.slice(i, i + PAGES_PER_BATCH));
          }

          send({ type: "status", message: `${batches.length} batches starten (${pages.length} pagina's)...`, total_batches: batches.length });

          const allRecipes: any[] = [];
          let completedBatches = 0;

          for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
            const chunk = batches.slice(i, i + MAX_CONCURRENT);
            const results = await Promise.all(
              chunk.map(async (batch, j) => {
                const batchIdx = i + j;
                try {
                  const recipes = await processBatch(client, batch, bron);

                  // Assign images based on page_number
                  for (const recipe of recipes) {
                    const pn = recipe.page_number;
                    if (pn && pageImageMap.has(pn)) {
                      recipe.image_data = pageImageMap.get(pn);
                    } else if (pn) {
                      // Try adjacent pages
                      for (const offset of [-1, 1, -2, 2]) {
                        if (pageImageMap.has(pn + offset)) {
                          recipe.image_data = pageImageMap.get(pn + offset);
                          break;
                        }
                      }
                    }
                  }

                  completedBatches++;
                  allRecipes.push(...recipes);
                  send({
                    type: "batch_done",
                    batch: batchIdx + 1,
                    total_batches: batches.length,
                    completed: completedBatches,
                    found: recipes.length,
                    recipes,
                  });
                  return recipes;
                } catch (err: any) {
                  completedBatches++;
                  console.error(`[PDF Extract] Batch ${batchIdx + 1} error:`, err.message);
                  send({ type: "batch_error", batch: batchIdx + 1, error: err.message });
                  return [];
                }
              })
            );
          }

          console.log(`[PDF Extract] Total: ${allRecipes.length} recipes`);
          send({ type: "done", recipes: allRecipes, total: allRecipes.length });
        } catch (error: any) {
          console.error("[PDF Extract] Fatal:", error.message);
          send({ type: "error", error: error.message });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 422 });
  }
}
