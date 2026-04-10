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
- Bij "5x 80 gram carpaccio": bereken totaal → hoeveelheid:"400", eenheid:"gram", naam:"carpaccio (5 stuks)"
- Secties: als er kopjes staan ("Voor de dressing:"), gebruik het "groep" veld.
- Geef het paginanummer mee waarop de recepttekst staat (page_number).
- Lees ELKE hoeveelheid ZORGVULDIG. Mis er GEEN.
- ALLE tekst moet in het Nederlands zijn. Vertaal Engelstalige recepten volledig.

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
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
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

function parseAiJson(text: string): any[] {
  let jsonStr = text.trim();
  const m = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (m) jsonStr = m[1].trim();
  if (!jsonStr.startsWith("[")) {
    const am = jsonStr.match(/\[[\s\S]*\]/);
    if (am) jsonStr = am[0];
  }
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    const lc = jsonStr.lastIndexOf("},");
    if (lc > 0) {
      try { return JSON.parse(jsonStr.substring(0, lc + 1) + "]"); } catch {}
    }
    return [];
  }
}

async function matchImagesWithVision(
  client: Anthropic,
  recipes: any[],
  pageImages: Map<number, string>,
  send: (data: any) => void
) {
  const availImages = Array.from(pageImages.entries())
    .filter(([_, img]) => img)
    .sort(([a], [b]) => a - b);

  if (availImages.length === 0 || recipes.length === 0) return;

  send({ type: "status", message: `${availImages.length} foto's visueel matchen met ${recipes.length} recepten (Sonnet Vision)...` });

  try {
    const contentBlocks: any[] = [];

    for (const [pageNum, imgData] of availImages) {
      const base64 = imgData.replace(/^data:image\/\w+;base64,/, "");
      contentBlocks.push({ type: "text", text: `--- FOTO van pagina ${pageNum} ---` });
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: base64 },
      });
    }

    const recipeTitles = recipes.map((r, i) => `${i + 1}. "${r.title}"`).join("\n");
    contentBlocks.push({
      type: "text",
      text: `Koppel elke foto aan het juiste recept op basis van wat je ZIET.

Recepten:
${recipeTitles}

Antwoord als JSON array: [{"recipe_index": 0, "page": 6}, ...]
recipe_index = 0-based index. page = paginanummer van de foto.
Sla foto's over die niet bij een recept horen (logo's, decoratie).
Alleen JSON.`,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    const matches = parseAiJson(text);

    let matched = 0;
    for (const match of matches) {
      const idx = match.recipe_index;
      const page = match.page;
      if (typeof idx === "number" && idx >= 0 && idx < recipes.length && pageImages.has(page)) {
        recipes[idx].image_data = pageImages.get(page);
        matched++;
      }
    }

    send({ type: "status", message: `${matched}/${recipes.length} recepten gekoppeld aan een foto` });
    console.log(`[PDF Extract] Vision matched: ${matched}/${recipes.length}`);
  } catch (err: any) {
    console.error("[PDF Extract] Vision matching failed:", err.message);
    send({ type: "status", message: "Foto-matching mislukt, fallback gebruikt..." });

    // Fallback: simple offset matching
    recipes.sort((a: any, b: any) => (a.page_number || 0) - (b.page_number || 0));
    const used = new Set<number>();
    for (const recipe of recipes) {
      const pn = recipe.page_number || 0;
      for (const off of [0, -1, 1, -2, 2]) {
        const pg = pn + off;
        if (pageImages.has(pg) && pageImages.get(pg) && !used.has(pg)) {
          recipe.image_data = pageImages.get(pg);
          used.add(pg);
          break;
        }
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("pdf") as File | null;
      if (!file) return Response.json({ error: "Geen PDF" }, { status: 400 });

      console.log(`[PDF Extract] File: ${file.name}, ${(file.size / 1024 / 1024).toFixed(1)}MB`);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

          try {
            send({ type: "status", message: `PDF inlezen: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...` });

            const pythonResult = await tryPythonExtraction(file);
            if (!pythonResult || pythonResult.error) {
              send({ type: "status", message: "Python extractie niet beschikbaar, client-side fallback..." });
              send({ type: "fallback_to_client" });
              controller.close();
              return;
            }

            send({ type: "status", message: "Tekst en afbeeldingen geëxtraheerd" });

            if (pythonResult.mode === "broodje_dunner") {
              send({ type: "status", message: `${pythonResult.total} recepten gevonden (Broodje Dunner)` });
              send({ type: "done", recipes: pythonResult.recipes, total: pythonResult.total });
              controller.close();
              return;
            }

            // Generic PDF: AI extraction
            const allPages = pythonResult.pages;
            const pageImages = new Map<number, string>(allPages.map((p: any) => [p.pageNum, p.image]));
            const imgCount = Array.from(pageImages.values()).filter(Boolean).length;
            const textPages = allPages.filter((p: any) => p.text && p.text.length > 30);
            const imageOnlyPages = allPages.filter((p: any) => (!p.text || p.text.length <= 30) && p.image);
            const bron = file.name.toLowerCase().includes("broodje") ? "Broodje Dunner" : null;

            send({ type: "status", message: `${allPages.length} pagina's, ${textPages.length} met tekst, ${imgCount} met foto` });

            const client = new Anthropic();
            const allRecipes: any[] = [];

            // If pages have text, use text-based extraction with Haiku
            if (textPages.length > 0) {
              const BATCH_SIZE = 4;
              const batches: any[][] = [];
              for (let i = 0; i < textPages.length; i += BATCH_SIZE) {
                batches.push(textPages.slice(i, i + BATCH_SIZE));
              }

              let completed = 0;

              for (let b = 0; b < batches.length; b += 3) {
                const chunk = batches.slice(b, b + 3);
                const startPage = chunk[0][0]?.pageNum || "?";
                const endPage = chunk[chunk.length - 1][chunk[chunk.length - 1].length - 1]?.pageNum || "?";
                send({ type: "status", message: `Recepten herkennen: pagina ${startPage}-${endPage} (batch ${b / 3 + 1}/${Math.ceil(batches.length / 3)})...` });

                await Promise.all(
                  chunk.map(async (batch, j) => {
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
                      const recipes = parseAiJson(text).filter((r: any) => r.title && r.ingredients?.length > 0);

                      completed++;
                      allRecipes.push(...recipes);
                      send({
                        type: "batch_done",
                        batch: batchIdx + 1,
                        total_batches: batches.length,
                        completed,
                        found: recipes.length,
                        recipes,
                      });
                    } catch (err: any) {
                      completed++;
                      send({ type: "batch_error", batch: batchIdx + 1, total_batches: batches.length, completed, error: err.message });
                    }
                  })
                );
              }
            }

            // If pages only have images (no text), use Vision to read recipes from images
            if (imageOnlyPages.length > 0 && allRecipes.length === 0) {
              send({ type: "status", message: `${imageOnlyPages.length} pagina's met alleen afbeeldingen, Vision wordt gebruikt om tekst te lezen...` });

              const IMG_BATCH = 4;
              const imgBatches: any[][] = [];
              for (let i = 0; i < imageOnlyPages.length; i += IMG_BATCH) {
                imgBatches.push(imageOnlyPages.slice(i, i + IMG_BATCH));
              }

              let imgCompleted = 0;

              for (let b = 0; b < imgBatches.length; b += 2) {
                const chunk = imgBatches.slice(b, b + 2);
                await Promise.all(
                  chunk.map(async (batch, j) => {
                    const batchIdx = b + j;
                    try {
                      const contentBlocks: any[] = [];
                      for (const page of batch) {
                        const base64 = page.image.replace(/^data:image\/\w+;base64,/, "");
                        contentBlocks.push({ type: "text", text: `--- PAGINA ${page.pageNum} ---` });
                        contentBlocks.push({
                          type: "image",
                          source: { type: "base64", media_type: "image/jpeg", data: base64 },
                        });
                      }
                      contentBlocks.push({
                        type: "text",
                        text: "Lees de tekst in deze afbeeldingen en vind alle recepten. Retourneer ze als JSON array.",
                      });

                      const response = await client.messages.create({
                        model: "claude-sonnet-4-6",
                        max_tokens: 16384,
                        system: buildAiPrompt(bron),
                        messages: [{ role: "user", content: contentBlocks }],
                      });

                      const text = response.content.filter((bl: any) => bl.type === "text").map((bl: any) => bl.text).join("\n");
                      const recipes = parseAiJson(text).filter((r: any) => r.title && r.ingredients?.length > 0);

                      imgCompleted++;
                      allRecipes.push(...recipes);
                      send({
                        type: "batch_done",
                        batch: batchIdx + 1,
                        total_batches: imgBatches.length,
                        completed: imgCompleted,
                        found: recipes.length,
                        recipes,
                      });
                    } catch (err: any) {
                      imgCompleted++;
                      send({ type: "batch_error", batch: batchIdx + 1, total_batches: imgBatches.length, completed: imgCompleted, error: err.message });
                    }
                  })
                );
              }
            }

            // Match images with Sonnet Vision
            if (textPages.length > 0) {
              await matchImagesWithVision(client, allRecipes, pageImages, send);
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
    }

    // Handle JSON (client-side extracted pages)
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

    const pageImageMap = new Map<number, string>();
    if (Array.isArray(images)) {
      images.forEach((img: string | null, idx: number) => {
        if (img) {
          const pageNum = typeof pages[idx] === "object" ? pages[idx].pageNum : idx + 1;
          pageImageMap.set(pageNum, img);
        }
      });
    }

    const pageData = pages.map((p: any, idx: number) => ({
      pageNum: typeof p === "object" ? p.pageNum : idx + 1,
      text: typeof p === "string" ? p : p.text || "",
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          const textPages = pageData.filter((p: any) => p.text && p.text.length > 30);

          send({ type: "status", message: `${pageData.length} pagina's, ${textPages.length} met tekst` });

          const client = new Anthropic();
          const allRecipes: any[] = [];

          // Text-based extraction with Haiku
          if (textPages.length > 0) {
            const BATCH_SIZE = 10;
            const batches: typeof textPages[] = [];
            for (let i = 0; i < textPages.length; i += BATCH_SIZE) {
              batches.push(textPages.slice(i, i + BATCH_SIZE));
            }

            let completed = 0;

            for (let b = 0; b < batches.length; b += 3) {
              const chunk = batches.slice(b, b + 3);
              await Promise.all(
                chunk.map(async (batch, j) => {
                  const batchIdx = b + j;
                  try {
                    const pageText = batch.map((p) => `--- PAGINA ${p.pageNum} ---\n${p.text}`).join("\n\n");
                    const response = await client.messages.create({
                      model: "claude-haiku-4-5-20251001",
                      max_tokens: 16384,
                      system: buildAiPrompt(bron),
                      messages: [{ role: "user", content: `Vind alle recepten:\n\n${pageText}` }],
                    });

                    const text = response.content.filter((bl) => bl.type === "text").map((bl) => (bl as any).text).join("\n");
                    const recipes = parseAiJson(text).filter((r: any) => r.title && r.ingredients?.length > 0);

                    completed++;
                    allRecipes.push(...recipes);
                    send({ type: "batch_done", batch: batchIdx + 1, total_batches: batches.length, completed, found: recipes.length, recipes });
                  } catch (err: any) {
                    completed++;
                    send({ type: "batch_error", batch: batchIdx + 1, error: err.message });
                  }
                })
              );
            }
          }

          // Vision-based extraction for image-only pages
          const imageOnlyPageNums = pageData
            .filter((p: any) => (!p.text || p.text.length <= 30))
            .map((p: any) => p.pageNum);
          const visionImages = imageOnlyPageNums
            .filter((pn: number) => pageImageMap.has(pn) && pageImageMap.get(pn))
            .map((pn: number) => ({ pageNum: pn, image: pageImageMap.get(pn)! }));

          if (visionImages.length > 0 && allRecipes.length === 0) {
            send({ type: "status", message: `${visionImages.length} pagina's met alleen afbeeldingen, Vision wordt gebruikt...` });

            const IMG_BATCH = 4;
            const imgBatches: typeof visionImages[] = [];
            for (let i = 0; i < visionImages.length; i += IMG_BATCH) {
              imgBatches.push(visionImages.slice(i, i + IMG_BATCH));
            }

            let imgCompleted = 0;

            for (let b = 0; b < imgBatches.length; b += 2) {
              const chunk = imgBatches.slice(b, b + 2);
              await Promise.all(
                chunk.map(async (batch, j) => {
                  const batchIdx = b + j;
                  try {
                    const contentBlocks: any[] = [];
                    for (const page of batch) {
                      const base64 = page.image.replace(/^data:image\/\w+;base64,/, "");
                      contentBlocks.push({ type: "text", text: `--- PAGINA ${page.pageNum} ---` });
                      contentBlocks.push({
                        type: "image",
                        source: { type: "base64", media_type: "image/jpeg", data: base64 },
                      });
                    }
                    contentBlocks.push({
                      type: "text",
                      text: "Lees de tekst in deze afbeeldingen en vind alle recepten. Retourneer ze als JSON array.",
                    });

                    const response = await client.messages.create({
                      model: "claude-sonnet-4-6",
                      max_tokens: 16384,
                      system: buildAiPrompt(bron),
                      messages: [{ role: "user", content: contentBlocks }],
                    });

                    const text = response.content.filter((bl) => bl.type === "text").map((bl) => (bl as any).text).join("\n");
                    const recipes = parseAiJson(text).filter((r: any) => r.title && r.ingredients?.length > 0);

                    imgCompleted++;
                    allRecipes.push(...recipes);
                    send({ type: "batch_done", batch: batchIdx + 1, total_batches: imgBatches.length, completed: imgCompleted, found: recipes.length, recipes });
                  } catch (err: any) {
                    imgCompleted++;
                    send({ type: "batch_error", batch: batchIdx + 1, total_batches: imgBatches.length, completed: imgCompleted, error: err.message });
                  }
                })
              );
            }
          }

          // Match images with Sonnet Vision (only for text-extracted recipes)
          if (textPages.length > 0) {
            await matchImagesWithVision(client, allRecipes, pageImageMap, send);
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
