import { NextRequest } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import Anthropic from "@anthropic-ai/sdk";

const execFileAsync = promisify(execFile);
const TEMP_DIR = join(process.cwd(), "tmp");
const SCRIPT_PATH = join(process.cwd(), "scripts", "extract-pdf.py");

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

async function processWithAi(pages: any[], bron: string | null): Promise<any[]> {
  const client = new Anthropic();
  const allRecipes: any[] = [];
  const PAGES_PER_BATCH = 10;
  const MAX_CONCURRENT = 3;

  const batches: any[][] = [];
  for (let i = 0; i < pages.length; i += PAGES_PER_BATCH) {
    batches.push(pages.slice(i, i + PAGES_PER_BATCH));
  }

  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    const chunk = batches.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(
      chunk.map(async (batch, j) => {
        const batchIdx = i + j;
        const pageText = batch
          .map((p: any, k: number) => `--- PAGINA ${batchIdx * PAGES_PER_BATCH + k + 1} ---\n${p.text}`)
          .join("\n\n");

        try {
          const response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
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
          return (Array.isArray(parsed) ? parsed : [parsed]).filter(
            (r: any) => r.title && r.ingredients?.length > 0
          );
        } catch (err: any) {
          console.error(`[PDF AI] Batch ${batchIdx + 1} error:`, err.message);
          return [];
        }
      })
    );
    for (const recipes of results) allRecipes.push(...recipes);
  }

  return allRecipes;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("pdf") as File | null;

  if (!file) {
    return Response.json({ error: "Geen PDF bestand" }, { status: 400 });
  }

  // Save to temp file
  if (!existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
  const tempPath = join(TEMP_DIR, `upload-${Date.now()}.pdf`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    console.log(`[PDF Extract] File: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);

    // Run Python extractor
    const { stdout, stderr } = await execFileAsync("python", [SCRIPT_PATH, tempPath, file.name], {
      maxBuffer: 100 * 1024 * 1024,
      timeout: 120000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    if (stderr) console.warn("[PDF Extract] Python stderr:", stderr.substring(0, 200));

    const result = JSON.parse(stdout);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 422 });
    }

    if (result.mode === "broodje_dunner") {
      // Specialized parser found recipes directly
      console.log(`[PDF Extract] Broodje Dunner mode: ${result.total} recipes`);

      // Stream results
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const send = (data: any) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          send({ type: "status", message: `${result.total} recepten gevonden via Broodje Dunner parser` });
          send({ type: "done", recipes: result.recipes, total: result.total });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Generic mode — use AI on extracted pages
    console.log(`[PDF Extract] Generic mode: ${result.total_pages} pages`);

    // Detect bron from filename
    const filename = file.name.toLowerCase();
    let bron: string | null = null;
    if (filename.includes("hellofresh")) bron = "HelloFresh";
    else if (filename.includes("jumbo")) bron = "Jumbo";
    else if (filename.includes("ah") || filename.includes("allerhande")) bron = "Albert Heijn";

    const encoder = new TextEncoder();
    const pages = result.pages;
    const pageImages = pages.map((p: any) => p.image || null);

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          send({ type: "status", message: `${pages.length} pagina's analyseren met AI...` });

          const recipes = await processWithAi(pages, bron);

          // Assign images to recipes based on page_number
          const pageImageMap = new Map<number, string>();
          pages.forEach((p: any) => {
            if (p.image) pageImageMap.set(p.pageNum, p.image);
          });

          for (const recipe of recipes) {
            if (recipe.page_number && pageImageMap.has(recipe.page_number)) {
              recipe.image_data = pageImageMap.get(recipe.page_number);
            } else {
              // Fallback: try adjacent pages
              const pn = recipe.page_number || 0;
              for (const offset of [0, -1, 1, -2, 2]) {
                if (pageImageMap.has(pn + offset)) {
                  recipe.image_data = pageImageMap.get(pn + offset);
                  break;
                }
              }
            }
          }

          send({ type: "done", recipes, total: recipes.length });
        } catch (err: any) {
          send({ type: "error", error: err.message });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } finally {
    // Cleanup temp file
    try { await unlink(tempPath); } catch {}
  }
}
