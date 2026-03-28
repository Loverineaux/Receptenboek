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
- Alle tekst moet in het Nederlands zijn.
- Elk recept moet minstens een naam en ingrediënten hebben.
- Combineer ALLE ingrediënten in één lijst per recept. Geef hoeveelheid en eenheid apart op.
- Sla pagina's over die geen recepten bevatten.
- Zoek GOED naar voedingswaarden (calorieën/kcal, eiwitten, koolhydraten, vetten).
- ${bron ? `De bron is "${bron}".` : "Detecteer de bron uit de tekst."}
- Retourneer UITSLUITEND een JSON array.

Schema per recept:
{
  "title": "string",
  "subtitle": "string | null",
  "tijd": "string | null",
  "bron": "${bron || "string | null"}",
  "basis_porties": "number | null",
  "ingredients": [{"hoeveelheid": "string | null", "eenheid": "string | null", "naam": "string"}],
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

          // Assign images to recipes
          const availableImages = pageImages.filter(Boolean);
          for (let i = 0; i < recipes.length && i < availableImages.length; i++) {
            if (availableImages[i]) recipes[i].image_data = availableImages[i];
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
