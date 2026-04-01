import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SCRIPT_PATH = "scripts/extract-pdf.py";

function buildAiPrompt(bron: string | null) {
  return `Je bent een gespecialiseerde receptextractor. Je krijgt tekst uit een PDF met recepten.

TAAK: Vind ALLE recepten in de tekst en retourneer ze als een JSON array.

REGELS:
- Alle tekst moet in het Nederlands zijn. Vertaal indien nodig.
- Elk recept moet minstens een naam en ingrediënten hebben.
- Sla pagina's over die geen recepten bevatten.
- ${bron ? `De bron is "${bron}".` : "Detecteer de bron uit de tekst."}
- Retourneer UITSLUITEND een JSON array.

INGREDIËNTEN:
- Geef hoeveelheid, eenheid en naam ALTIJD apart.
- Telbare items: "4 tomaten" → hoeveelheid:"4", eenheid:"stuks", naam:"tomaten"
- Gewicht: "200 gram kipfilet" → hoeveelheid:"200", eenheid:"gram", naam:"kipfilet"
- Lepels: "3 eetlepels ketjap" → hoeveelheid:"3", eenheid:"eetlepels", naam:"ketjap"
- Zonder hoeveelheid: "Olie" → hoeveelheid:null, eenheid:null, naam:"olie"
- "naar smaak" / "snufje" items: hoeveelheid:null
- Bij "5x 80 gram carpaccio": bereken totaal → hoeveelheid:"400", eenheid:"gram", naam:"carpaccio (5 stuks)"
- Bij "2x 200 ml room": bereken totaal → hoeveelheid:"400", eenheid:"ml", naam:"room"
- Lees ELKE hoeveelheid ZORGVULDIG uit de tekst. Mis er GEEN.
- ALLE tekst moet in het Nederlands zijn. Vertaal Engelstalige recepten volledig (titel, ingrediënten, stappen).
- Secties: als er kopjes staan ("Voor de dressing:"), gebruik het "groep" veld.
- Geef het paginanummer mee waarop de recepttekst staat (page_number).

Schema per recept:
{
  "title": "string",
  "subtitle": "string | null",
  "tijd": "string | null",
  "temperatuur": "string | null (bijv. '180°C')",
  "bron": "${bron || "string | null"}",
  "basis_porties": "number | null",
  "page_number": "number | null",
  "ingredients": [{"hoeveelheid": "string|null", "eenheid": "string|null", "naam": "string", "groep": "string|null"}],
  "steps": [{"titel": "string|null", "beschrijving": "string"}],
  "nutrition": {"energie_kcal":"string|null","vetten":"string|null","koolhydraten":"string|null","eiwitten":"string|null"} | null,
  "tags": ["string"] | null
}`;
}

// Try Python extraction (works locally, not on Vercel)
async function tryPythonExtraction(file: File): Promise<any | null> {
  try {
    const { writeFile, unlink, mkdir } = await import("fs/promises");
    const { existsSync } = await import("fs");
    const { join } = await import("path");
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    const tmpDir = join(process.cwd(), "tmp");
    if (!existsSync(tmpDir)) await mkdir(tmpDir, { recursive: true });
    const tmpPath = join(tmpDir, `upload-${Date.now()}.pdf`);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpPath, buffer);

    try {
      const { stdout, stderr } = await execFileAsync("python", [SCRIPT_PATH, tmpPath, file.name], {
        maxBuffer: 100 * 1024 * 1024,
        timeout: 120000,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });
      if (stderr) console.log("[PDF Extract] Python stderr:", stderr.substring(0, 200));
      return JSON.parse(stdout);
    } finally {
      try { await unlink(tmpPath); } catch {}
    }
  } catch (err: any) {
    console.log("[PDF Extract] Python not available:", err.message?.substring(0, 80));
    return null;
  }
}

// AI-based extraction for generic PDFs (works on Vercel)
async function processWithAi(
  pages: { pageNum: number; text: string }[],
  bron: string | null
): Promise<any[]> {
  const client = new Anthropic();
  const allRecipes: any[] = [];
  const PAGES_PER_BATCH = 10;
  const MAX_CONCURRENT = 3;

  const batches: typeof pages[] = [];
  for (let i = 0; i < pages.length; i += PAGES_PER_BATCH) {
    batches.push(pages.slice(i, i + PAGES_PER_BATCH));
  }

  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    const chunk = batches.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(
      chunk.map(async (batch) => {
        const pageText = batch.map(p => `--- PAGINA ${p.pageNum} ---\n${p.text}`).join("\n\n");
        try {
          const response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 16384,
            system: buildAiPrompt(bron),
            messages: [{ role: "user", content: `Vind alle recepten:\n\n${pageText}` }],
          });

          const text = response.content.filter(b => b.type === "text").map(b => (b as any).text).join("\n");
          let jsonStr = text.trim();
          const m = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
          if (m) jsonStr = m[1].trim();
          if (!jsonStr.startsWith("[")) {
            const am = jsonStr.match(/\[[\s\S]*\]/);
            if (am) jsonStr = am[0];
          }

          let parsed;
          try { parsed = JSON.parse(jsonStr); } catch {
            const lastComplete = jsonStr.lastIndexOf('},');
            if (lastComplete > 0) {
              try { parsed = JSON.parse(jsonStr.substring(0, lastComplete + 1) + ']'); } catch { return []; }
            } else { return []; }
          }

          return (Array.isArray(parsed) ? parsed : [parsed]).filter((r: any) => r.title && r.ingredients?.length > 0);
        } catch (err: any) {
          console.error("[PDF Extract] AI batch error:", err.message);
          return [];
        }
      })
    );
    for (const recipes of results) allRecipes.push(...recipes);
  }

  return allRecipes;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle FormData (file upload) — try Python first
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("pdf") as File | null;
      if (!file) return Response.json({ error: "Geen PDF" }, { status: 400 });

      console.log(`[PDF Extract] File: ${file.name}, ${(file.size / 1024 / 1024).toFixed(1)}MB`);

      const pythonResult = await tryPythonExtraction(file);
      if (pythonResult && !pythonResult.error) {
        console.log(`[PDF Extract] Python: mode=${pythonResult.mode}, ${pythonResult.mode === 'broodje_dunner' ? pythonResult.total + ' recipes' : pythonResult.total_pages + ' pages'}`);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

            if (pythonResult.mode === "broodje_dunner") {
              send({ type: "status", message: `${pythonResult.total} recepten gevonden (Broodje Dunner parser)` });
              send({ type: "done", recipes: pythonResult.recipes, total: pythonResult.total });
            } else {
              // Generic: use AI on pages with live progress
              const allPages = pythonResult.pages;
              const pageImages = new Map(allPages.map((p: any) => [p.pageNum, p.image]));
              const bron = file.name.toLowerCase().includes("broodje") ? "Broodje Dunner" : null;

              // Only send text pages to AI
              const textPages = allPages.filter((p: any) => p.text && p.text.length > 30);
              const BATCH_SIZE = 10;
              const batches: any[][] = [];
              for (let b = 0; b < textPages.length; b += BATCH_SIZE) {
                batches.push(textPages.slice(b, b + BATCH_SIZE));
              }

              send({ type: "status", message: `${textPages.length} pagina's in ${batches.length} batch(es) analyseren...`, total_batches: batches.length });

              const client = new Anthropic();
              const allRecipes: any[] = [];
              const globalUsedImages = new Set<number>();
              let completed = 0;

              for (let b = 0; b < batches.length; b += 3) {
                const chunk = batches.slice(b, b + 3);
                await Promise.all(chunk.map(async (batch, j) => {
                  const batchIdx = b + j;
                  try {
                    const pageText = batch.map((p: any) => `--- PAGINA ${p.pageNum} ---\n${p.text}`).join("\n\n");
                    const response = await client.messages.create({
                      model: "claude-haiku-4-5-20251001",
                      max_tokens: 16384,
                      system: buildAiPrompt(bron),
                      messages: [{ role: "user", content: `Vind alle recepten:\n\n${pageText}` }],
                    });

                    const text = response.content.filter((bl: any) => bl.type === "text").map((bl: any) => bl.text).join("\n");
                    let jsonStr = text.trim();
                    const mm = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
                    if (mm) jsonStr = mm[1].trim();
                    if (!jsonStr.startsWith("[")) {
                      const am = jsonStr.match(/\[[\s\S]*\]/);
                      if (am) jsonStr = am[0];
                    }

                    let parsed;
                    try { parsed = JSON.parse(jsonStr); } catch {
                      const lc = jsonStr.lastIndexOf('},');
                      if (lc > 0) { try { parsed = JSON.parse(jsonStr.substring(0, lc + 1) + ']'); } catch { parsed = []; } }
                      else parsed = [];
                    }

                    const recipes = (Array.isArray(parsed) ? parsed : [parsed]).filter((r: any) => r.title && r.ingredients?.length > 0);

                    // Don't assign images here — done globally after all batches via Sonnet vision
                    completed++;
                    allRecipes.push(...recipes);
                    const names = recipes.map((r: any) => r.title).join(', ');
                    send({ type: "batch_done", batch: batchIdx + 1, total_batches: batches.length, completed, found: recipes.length, recipes });
                  } catch (err: any) {
                    completed++;
                    send({ type: "batch_error", batch: batchIdx + 1, total_batches: batches.length, completed, error: err.message });
                  }
                }));
              }

              // Step 2: Match images to recipes using Sonnet vision
              const availImages = [...pageImages.entries()]
                .filter(([_, img]) => img)
                .sort(([a], [b]) => a - b);

              if (availImages.length > 0 && allRecipes.length > 0) {
                send({ type: "status", message: `Afbeeldingen koppelen aan ${allRecipes.length} recepten...` });

                try {
                  // Build content: all images + recipe titles
                  const contentBlocks: any[] = [];

                  for (const [pageNum, imgData] of availImages) {
                    // Strip data URL prefix for API
                    const base64 = imgData.replace(/^data:image\/\w+;base64,/, '');
                    contentBlocks.push({
                      type: "text",
                      text: `--- FOTO van pagina ${pageNum} ---`,
                    });
                    contentBlocks.push({
                      type: "image",
                      source: { type: "base64", media_type: "image/jpeg", data: base64 },
                    });
                  }

                  const recipeTitles = allRecipes.map((r, i) => `${i + 1}. "${r.title}"`).join('\n');
                  contentBlocks.push({
                    type: "text",
                    text: `Hieronder staan ${allRecipes.length} recepten. Koppel elke foto aan het juiste recept op basis van wat je ZIET op de foto.

Recepten:
${recipeTitles}

Antwoord als JSON array van objecten: [{"recipe_index": 0, "page": 6}, {"recipe_index": 1, "page": 8}, ...]
recipe_index = 0-based index van het recept in de lijst hierboven.
page = het paginanummer van de foto.
Als een foto niet bij een recept hoort (bijv. logo, decoratie), sla die dan over.
Alleen JSON.`,
                  });

                  const matchResponse = await client.messages.create({
                    model: "claude-sonnet-4-6",
                    max_tokens: 2048,
                    messages: [{ role: "user", content: contentBlocks }],
                  });

                  const matchText = matchResponse.content
                    .filter((b: any) => b.type === "text")
                    .map((b: any) => b.text)
                    .join("\n").trim();

                  let matchJson = matchText;
                  const cm = matchJson.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
                  if (cm) matchJson = cm[1].trim();
                  if (!matchJson.startsWith("[")) {
                    const am = matchJson.match(/\[[\s\S]*\]/);
                    if (am) matchJson = am[0];
                  }

                  const matches = JSON.parse(matchJson);
                  for (const match of matches) {
                    const idx = match.recipe_index;
                    const page = match.page;
                    if (idx >= 0 && idx < allRecipes.length && pageImages.has(page)) {
                      allRecipes[idx].image_data = pageImages.get(page);
                    }
                  }

                  const withImg = allRecipes.filter((r: any) => r.image_data).length;
                  console.log(`[PDF Extract] Image matching: ${withImg}/${allRecipes.length} recipes got images`);
                } catch (imgErr: any) {
                  console.error("[PDF Extract] Image matching failed:", imgErr.message);
                  // Fallback: simple offset matching
                  allRecipes.sort((a: any, b: any) => (a.page_number || 0) - (b.page_number || 0));
                  const usedImgs = new Set<number>();
                  for (const recipe of allRecipes) {
                    const pn = recipe.page_number || 0;
                    for (const off of [0, -1, 1, -2, 2]) {
                      const pg = pn + off;
                      if (pageImages.has(pg) && pageImages.get(pg) && !usedImgs.has(pg)) {
                        recipe.image_data = pageImages.get(pg);
                        usedImgs.add(pg);
                        break;
                      }
                    }
                  }
                }
              }

              send({ type: "done", recipes: allRecipes, total: allRecipes.length });
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      }

      // Python failed — fall through to client-side approach
      console.log("[PDF Extract] Python unavailable, need client-side extraction");
      return Response.json({ error: "Python niet beschikbaar. Gebruik de client-side PDF upload." }, { status: 422 });
    }

    // Handle JSON (client-side extracted pages) — AI processing
    const body = await request.json();
    const { pages, images, filename, bron: userBron } = body;

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return Response.json({ error: "Geen pagina-teksten ontvangen" }, { status: 400 });
    }

    let bron = userBron || null;
    if (!bron && filename) {
      const fn = filename.toLowerCase();
      if (fn.includes("broodje") && fn.includes("dunner")) bron = "Broodje Dunner";
    }

    console.log(`[PDF Extract] Client-side: ${pages.length} pages, bron: ${bron || 'auto'}`);

    // Build page image map
    const pageImageMap = new Map<number, string>();
    if (Array.isArray(images)) {
      images.forEach((img: string | null, idx: number) => {
        if (img) {
          const pageNum = typeof pages[idx] === 'object' ? pages[idx].pageNum : idx + 1;
          pageImageMap.set(pageNum, img);
        }
      });
    }

    const pageData = pages.map((p: any, idx: number) => ({
      pageNum: typeof p === 'object' ? p.pageNum : idx + 1,
      text: typeof p === 'string' ? p : p.text || '',
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          const batches: typeof pageData[] = [];
          for (let i = 0; i < pageData.length; i += 6) {
            batches.push(pageData.slice(i, i + 6));
          }

          send({ type: "status", message: `${batches.length} batches (${pageData.length} pagina's)`, total_batches: batches.length });

          const allRecipes: any[] = [];
          let completed = 0;

          for (let i = 0; i < batches.length; i += 3) {
            const chunk = batches.slice(i, i + 3);
            const results = await Promise.all(
              chunk.map(async (batch, j) => {
                const batchIdx = i + j;
                try {
                  const recipes = await processWithAi(batch, bron);
                  for (const r of recipes) {
                    const pn = r.page_number;
                    if (pn) {
                      for (const off of [0, -1, 1, -2, 2]) {
                        if (pageImageMap.has(pn + off)) { r.image_data = pageImageMap.get(pn + off); break; }
                      }
                    }
                  }
                  completed++;
                  allRecipes.push(...recipes);
                  send({ type: "batch_done", batch: batchIdx + 1, total_batches: batches.length, completed, found: recipes.length, recipes });
                  return recipes;
                } catch (err: any) {
                  completed++;
                  send({ type: "batch_error", batch: batchIdx + 1, error: err.message });
                  return [];
                }
              })
            );
          }

          send({ type: "done", recipes: allRecipes, total: allRecipes.length });
        } catch (err: any) {
          send({ type: "error", error: err.message });
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
