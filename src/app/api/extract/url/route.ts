import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  parseRecipeResponse,
} from "@/lib/extraction/prompt";
import { scrapePage, jsonLdToRecipe, detectBronFromUrl } from "@/lib/extraction/scrape";
import { getCachedRecipe, setCachedRecipe } from "@/lib/extraction/cache";
import { validateRecipe } from "@/lib/extraction/validate";

function detectSocialPlatform(url: string): string | null {
  const hostname = new URL(url).hostname.replace('www.', '');
  if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) return 'instagram';
  if (hostname.includes('tiktok.com')) return 'tiktok';
  if (hostname.includes('facebook.com') || hostname.includes('fb.com') || hostname.includes('fb.watch')) return 'facebook';
  if (hostname.includes('pinterest.com') || hostname.includes('pin.it')) return 'pinterest';
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
  return null;
}

function respondWithValidation(recipe: any) {
  const validation = validateRecipe(recipe);
  console.log(`[URL Extract] Validation score: ${validation.score}/100, issues: ${validation.issues.length}`);
  return NextResponse.json({ ...recipe, _validation: validation });
}

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

    // Social media detection — skip scrape, go straight to web search
    const socialPlatform = detectSocialPlatform(url);
    if (socialPlatform) {
      console.log(`[URL Extract] Social media detected (${socialPlatform}), skipping scrape, using web search`);
      const recipe = await fallbackWebSearch(url);
      if (!recipe.bron) recipe.bron = detectBronFromUrl(url);
      setCachedRecipe(url, recipe);
      return respondWithValidation(recipe);
    }

    console.log("[URL Extract] Scraping:", url);

    // Step 1: Scrape the page directly
    let scraped;
    try {
      scraped = await scrapePage(url);
      console.log("[URL Extract] Scraped OK. JSON-LD:", !!scraped.jsonLd, "OG Image:", !!scraped.ogImage);
    } catch (scrapeError: any) {
      console.log("[URL Extract] Scrape failed:", scrapeError.message, "— falling back to web search");
      const recipe = await fallbackWebSearch(url);

      if (!recipe.bron) recipe.bron = detectBronFromUrl(url);

      // Flag incomplete data so frontend can warn user
      const ings = recipe.ingredients || [];
      const missingQty = ings.filter((i: any) => !i.hoeveelheid).length;
      if (missingQty > ings.length / 2) {
        recipe._incomplete = true;
      }

      setCachedRecipe(url, recipe);
      return respondWithValidation(recipe);
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
      return respondWithValidation(recipe);
    }

    // Step 3: No JSON-LD — use Claude to extract from page text
    console.log("[URL Extract] No JSON-LD, using Claude on page text");
    try {
      return await extractWithClaude(scraped.pageText, url, scraped.ogImage);
    } catch (claudeError: any) {
      console.log("[URL Extract] Claude page-text extraction failed:", claudeError.message, "— trying web search");
      const recipe = await fallbackWebSearch(url);

      setCachedRecipe(url, recipe);
      return respondWithValidation(recipe);
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
    model: "claude-sonnet-4-6",
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
  return respondWithValidation(recipe);
}

async function fallbackWebSearch(url: string): Promise<any> {
  console.log("[URL Extract] Using web search fallback for:", url);
  const client = new Anthropic();

  const searchResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system:
      "Je bent een assistent die recepten opzoekt via het web. Zoek de volledige receptinformatie op van de gegeven URL. Geef ALLE gevonden informatie terug. Het is CRUCIAAL dat je de EXACTE hoeveelheden en eenheden bij elke ingrediënt geeft (bijv. '400 gram kippendijen', niet alleen 'kippendijen'). Geef ook de afbeelding-URL van het recept als je die kunt vinden.",
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
        content: `Zoek het volledige recept op van deze URL: ${url}

STAP 1: Zoek het recept op via de URL. Als de pagina niet direct bereikbaar is, zoek dan op de receptnaam + website naam.
STAP 2: Zoek SPECIFIEK naar de ingrediëntenlijst met EXACTE hoeveelheden. Zoek eventueel apart op "[receptnaam] ingrediënten" als je ze niet vindt.
STAP 3: Zoek ook naar de afbeelding van het gerecht.

Geef ALLE informatie die je vindt:
- Titel van het recept
- Afbeelding URL (de directe URL naar de receptfoto, bijv. eindigend op .jpg/.png/.webp)
- Ingrediënten met EXACTE hoeveelheden en eenheden. Elk ingrediënt MOET een hoeveelheid hebben als die op de website staat (bijv. "400 gram kippendijen", "3 eetlepels ketjap manis", "½ theelepel nootmuskaat"). Als je geen hoeveelheid kunt vinden, geef dan "naar smaak" aan.
- Alle bereidingsstappen in de juiste volgorde
- Bereidingstijd en aantal porties
- Voedingswaarden als beschikbaar

Als het recept in het Engels is, vertaal dan alles naar het Nederlands.`,
      },
    ],
  });

  const searchText = searchResponse.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  // If no quantities found in first search, do a targeted ingredient search
  const hasQuantities = /\d+\s*(gram|g|ml|el|tl|eetlepel|theelepel|stuk)/i.test(searchText);
  let extraIngredientText = "";
  if (!hasQuantities) {
    console.log("[URL Extract] No quantities found, doing targeted ingredient search");
    try {
      const slug = new URL(url).pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "";
      const hostname = new URL(url).hostname.replace("www.", "");
      const ingSearch = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: "Zoek specifiek de ingrediëntenlijst met hoeveelheden van dit recept. Geef ALLE ingrediënten met exacte hoeveelheden.",
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{
          role: "user",
          content: `Zoek de ingrediëntenlijst met exacte hoeveelheden voor het recept "${slug}" van ${hostname}. Ik heb de hoeveelheden nodig zoals "400 gram kippendijen", "3 el ketjap manis" etc.`,
        }],
      });
      extraIngredientText = ingSearch.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n");
      console.log("[URL Extract] Extra ingredient search done, length:", extraIngredientText.length);
    } catch {}
  }

  const fullText = extraIngredientText
    ? `${searchText}\n\nEXTRA INGREDIËNTEN INFO:\n${extraIngredientText}`
    : searchText;

  const structureResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Hier is de receptinformatie gevonden op ${url}:\n\n${fullText}\n\nRetourneer dit als een enkel JSON-object volgens het opgegeven schema. Zorg dat ELKE ingrediënt een hoeveelheid en eenheid heeft als die beschikbaar is. Zorg dat image_url wordt ingevuld als je een afbeelding hebt gevonden. ALLEEN JSON, geen andere tekst.`,
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

  return recipe;
}
