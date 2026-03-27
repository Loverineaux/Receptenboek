import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MULTI_RECIPE_PROMPT = `Je bent een gespecialiseerde receptextractor. Je krijgt tekst uit een PDF e-book met recepten.

TAAK: Vind ALLE recepten in de tekst en retourneer ze als een JSON array.

REGELS:
- Alle tekst moet in het Nederlands zijn. Vertaal Engelstalige recepten naar het Nederlands.
- Elk recept moet minstens een naam en ingrediënten hebben.
- Combineer ALLE ingrediënten in één lijst per recept.
- Sla pagina's over die geen recepten bevatten (inhoudsopgave, inleiding, etc).
- Neem benodigdheden (keukengereedschap) op als vermeld.
- Retourneer UITSLUITEND een JSON array. Geen uitleg, geen markdown.

Elk recept in de array volgt dit schema:
{
  "title": "string",
  "subtitle": "string | null",
  "tijd": "string | null (bijv. '25 min')",
  "moeilijkheid": "'Makkelijk' | 'Gemiddeld' | 'Moeilijk' | null",
  "bron": "string | null (naam van het e-book/bron)",
  "basis_porties": "number | null",
  "ingredients": [{"hoeveelheid": "string | null", "eenheid": "string | null", "naam": "string"}],
  "steps": [{"titel": "string | null", "beschrijving": "string"}],
  "benodigdheden": ["string"] | null,
  "tags": ["string"] | null
}

Retourneer ALLEEN de JSON array. Geen andere tekst.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pages } = body;

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: "Geen pagina-teksten ontvangen" },
        { status: 400 }
      );
    }

    console.log(`[PDF Extract] Received ${pages.length} pages of text`);

    const client = new Anthropic();
    const allRecipes: any[] = [];

    // Process pages in batches of 10
    const PAGES_PER_BATCH = 10;
    const batches: string[][] = [];
    for (let i = 0; i < pages.length; i += PAGES_PER_BATCH) {
      batches.push(pages.slice(i, i + PAGES_PER_BATCH));
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const pageText = batch
        .map((text, i) => `--- PAGINA ${batchIdx * PAGES_PER_BATCH + i + 1} ---\n${text}`)
        .join("\n\n");

      console.log(`[PDF Extract] Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} pages)`);

      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8192,
          system: MULTI_RECIPE_PROMPT,
          messages: [
            {
              role: "user",
              content: `Vind alle recepten in deze pagina's:\n\n${pageText}`,
            },
          ],
        });

        const responseText = response.content
          .filter((block) => block.type === "text")
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("\n");

        // Parse JSON array
        let jsonStr = responseText.trim();
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }
        if (!jsonStr.startsWith("[")) {
          const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
          if (arrayMatch) jsonStr = arrayMatch[0];
        }

        const parsed = JSON.parse(jsonStr);
        const recipes = Array.isArray(parsed) ? parsed : [parsed];

        for (const recipe of recipes) {
          if (recipe.title && recipe.ingredients?.length > 0) {
            allRecipes.push(recipe);
          }
        }

        console.log(`[PDF Extract] Batch ${batchIdx + 1}: found ${recipes.length} recipes`);
      } catch (batchError: any) {
        console.error(`[PDF Extract] Batch ${batchIdx + 1} error:`, batchError.message);
      }
    }

    console.log(`[PDF Extract] Total recipes found: ${allRecipes.length}`);
    return NextResponse.json({ recipes: allRecipes, total: allRecipes.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[PDF Extract] Fatal error:", message);
    return NextResponse.json(
      { error: `PDF extractie mislukt: ${message}` },
      { status: 422 }
    );
  }
}
