import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  parseRecipeResponse,
} from "@/lib/extraction/prompt";
import { scrapePage, jsonLdToRecipe, detectBronFromUrl } from "@/lib/extraction/scrape";
import { getCachedRecipe, setCachedRecipe } from "@/lib/extraction/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check cache
    const cached = getCachedRecipe(url);
    if (cached) {
      console.log("[URL Extract] Cache hit for:", url);
      return NextResponse.json(cached);
    }

    console.log("[URL Extract] Scraping:", url);

    // Step 1: Scrape the page directly
    let scraped;
    try {
      scraped = await scrapePage(url);
      console.log("[URL Extract] Scraped OK. JSON-LD:", !!scraped.jsonLd, "OG Image:", !!scraped.ogImage);
    } catch (scrapeError: any) {
      console.log("[URL Extract] Scrape failed:", scrapeError.message, "— falling back to web search");
      // Fall back to web search if scraping fails
      return await fallbackWebSearch(url);
    }

    // Step 2: If JSON-LD found, use it directly (fast path)
    if (scraped.jsonLd) {
      console.log("[URL Extract] Using JSON-LD structured data");
      const recipe = jsonLdToRecipe(scraped.jsonLd, scraped.ogImage);

      // Set bron from URL if not detected from JSON-LD
      if (!recipe.bron) {
        recipe.bron = detectBronFromUrl(url);
      }

      // If JSON-LD is missing steps or ingredients, enhance with Claude
      if (recipe.steps.length === 0 || recipe.ingredients.length === 0) {
        console.log("[URL Extract] JSON-LD incomplete, enhancing with Claude");
        return await extractWithClaude(scraped.pageText, url, scraped.ogImage);
      }

      setCachedRecipe(url, recipe);
      return NextResponse.json(recipe);
    }

    // Step 3: No JSON-LD — use Claude to extract from page text
    console.log("[URL Extract] No JSON-LD, using Claude on page text");
    try {
      return await extractWithClaude(scraped.pageText, url, scraped.ogImage);
    } catch (claudeError: any) {
      console.log("[URL Extract] Claude page-text extraction failed:", claudeError.message, "— trying web search");
      return await fallbackWebSearch(url);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[URL Extract] Fatal error:", message);

    // Last resort: try to extract a minimal recipe from URL slug
    if (message.includes("missing a valid title")) {
      try {
        const slug = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
        const title = slug.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        if (title.length > 3) {
          console.log("[URL Extract] Using URL slug as title fallback:", title);
          return NextResponse.json({
            title,
            subtitle: null,
            image_url: null,
            tijd: null,
            moeilijkheid: null,
            bron: detectBronFromUrl(url),
            basis_porties: null,
            ingredients: [],
            steps: [],
            nutrition: null,
            tags: null,
            weetje: null,
            allergenen: null,
            benodigdheden: null,
          });
        }
      } catch {}
    }

    return NextResponse.json(
      { error: `Failed to extract recipe: ${message}` },
      { status: 422 }
    );
  }
}

async function extractWithClaude(
  pageText: string,
  url: string,
  ogImage: string | null
): Promise<NextResponse> {
  const client = new Anthropic();

  const imageInstruction = ogImage
    ? `\n\nDe afbeelding van dit recept is: ${ogImage} — gebruik dit als image_url.`
    : "";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Hier is de tekst van een receptpagina (${url}):

${pageText}${imageInstruction}

Retourneer dit als een enkel JSON-object volgens het opgegeven schema. ALLEEN JSON, geen andere tekst.`,
      },
    ],
  });

  const textBlocks = response.content.filter((block) => block.type === "text");
  if (textBlocks.length === 0) {
    return NextResponse.json(
      { error: "No text response received from AI" },
      { status: 422 }
    );
  }

  const responseText = textBlocks
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  const recipe = parseRecipeResponse(responseText);

  // Ensure image is set from OG if Claude didn't find one
  if (!recipe.image_url && ogImage) {
    recipe.image_url = ogImage;
  }

  // Set bron from URL
  if (!recipe.bron) {
    recipe.bron = detectBronFromUrl(url);
  }

  setCachedRecipe(url, recipe);
  return NextResponse.json(recipe);
}

async function fallbackWebSearch(url: string): Promise<NextResponse> {
  console.log("[URL Extract] Using web search fallback for:", url);
  const client = new Anthropic();

  const searchResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system:
      "Je bent een assistent die recepten opzoekt via het web. Zoek de volledige receptinformatie op van de gegeven URL. Geef alle gevonden informatie terug inclusief de afbeelding-URL van het recept.",
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
    ],
    messages: [
      {
        role: "user",
        content: `Zoek het volledige recept op van deze URL: ${url}\n\nGeef ALLE informatie die je vindt:\n- Titel van het recept\n- Afbeelding URL\n- Ingrediënten met exacte hoeveelheden en eenheden\n- Bereidingsstappen\n- Bereidingstijd\n- Aantal porties\n- Voedingswaarden (calorieën, vetten, koolhydraten, eiwitten, etc.)\n- Benodigdheden/keukengereedschap\n\nAls het recept in het Engels is, vertaal dan alles naar het Nederlands.`,
      },
    ],
  });

  const searchText = searchResponse.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  const structureResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Hier is de receptinformatie gevonden op ${url}:\n\n${searchText}\n\nRetourneer dit als een enkel JSON-object volgens het opgegeven schema. Zorg dat image_url wordt ingevuld als je een afbeelding hebt gevonden. ALLEEN JSON, geen andere tekst.`,
      },
    ],
  });

  const textBlocks = structureResponse.content.filter(
    (block) => block.type === "text"
  );
  if (textBlocks.length === 0) {
    return NextResponse.json(
      { error: "No text response received from AI" },
      { status: 422 }
    );
  }

  const responseText = textBlocks
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  const recipe = parseRecipeResponse(responseText);

  if (!recipe.bron) {
    recipe.bron = detectBronFromUrl(url);
  }

  setCachedRecipe(url, recipe);
  return NextResponse.json(recipe);
}
