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
  let url = '';
  try {
    const body = await request.json();
    url = body.url;

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

    // Hash-based SPA detection (e.g. app.projectgezond.nl/#/recepten/...)
    // Direct fetch/puppeteer can't render these on Vercel — use web search
    if (url.includes('#/') || url.includes('#!')) {
      console.log(`[URL Extract] Hash-based SPA detected, using web search`);
      const recipe = await fallbackWebSearch(url);
      if (!recipe.bron) recipe.bron = detectBronFromUrl(url);
      recipe._hashSPA = true;
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

  // Extract recipe name from URL slug for better search queries
  // For hash-based SPAs (e.g. #/recepten/orak-arik), extract from hash fragment
  const urlObj = new URL(url);
  const hashPath = urlObj.hash.replace(/^#\/?/, '');
  const slug = hashPath.split("/").filter(Boolean).pop()?.replace(/-/g, " ")
    || urlObj.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ")
    || "";
  const hostname = urlObj.hostname.replace("www.", "");

  const searchResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system:
      "Je bent een assistent die recepten opzoekt via het web. Zoek de volledige receptinformatie op. Het is CRUCIAAL dat je ALLE ingrediënten vindt met de EXACTE hoeveelheden en eenheden (bijv. '300 gram spitskool', '1 ui', '2 eieren', '30 ml ketjap manis'). Doe MEERDERE zoekopdrachten als de eerste niet alle ingrediënten met hoeveelheden geeft.",
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 8,
      },
    ],
    messages: [
      {
        role: "user",
        content: `Zoek het volledige recept op: "${slug}" van ${hostname} (${url})

De website is mogelijk niet direct bereikbaar. Gebruik daarom MEERDERE zoekstrategieën:

STAP 1: Zoek op "${slug} recept ingredienten ${hostname}".
STAP 2: Als stap 1 niet genoeg oplevert, zoek op "${slug} recept ingredienten hoeveelheden".
STAP 3: Zoek op "${slug} recept bereidingswijze" voor de stappen.
STAP 4: Zoek naar een afbeelding via "${slug} ${hostname}" en zoek naar directe afbeelding-URLs.

BELANGRIJK: Gebruik ALLEEN informatie van ${hostname}. Gebruik GEEN recepten van andere websites.

BELANGRIJK — Ingrediënten:
- Zoek ALLE ingrediënten, niet maar een paar. Tel ze na: als het originele recept 7 ingrediënten heeft, moeten er 7 in je antwoord staan.
- ELKE ingrediënt MOET een hoeveelheid hebben als die op de website staat (bijv. "300 gram spitskool", niet alleen "spitskool").
- Ingrediënten zonder specifieke hoeveelheid (bijv. "peper") markeer je als "naar smaak".

Geef ALLE informatie die je vindt:
- Titel van het recept
- Afbeelding URL (directe URL naar de receptfoto)
- Ingrediënten met EXACTE hoeveelheden en eenheden
- Alle bereidingsstappen in de juiste volgorde
- Bereidingstijd (bijv. "25 min")
- Aantal porties/personen (bijv. "Twee personen" = 2, "Voor 4 personen" = 4) — dit staat vaak bovenaan de ingrediëntenlijst
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
  const hasQuantities = /\d+\s*(gram|g|ml|el|tl|eetlepel|theelepel|stuk|stuks|ui|eieren?|teen)/i.test(searchText);
  let extraIngredientText = "";
  if (!hasQuantities) {
    console.log("[URL Extract] No quantities found, doing targeted ingredient search");
    try {
      const ingSearch = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: `Zoek specifiek de ingrediëntenlijst met hoeveelheden van dit recept op ${hostname}. Geef ALLE ingrediënten met exacte hoeveelheden. Gebruik ALLEEN informatie van ${hostname}.`,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        messages: [{
          role: "user",
          content: `Zoek de VOLLEDIGE ingrediëntenlijst met exacte hoeveelheden voor het recept "${slug}". Ik heb ALLE ingrediënten nodig met hoeveelheden zoals "300 gram spitskool", "1 ui", "2 eieren", "30 ml ketjap manis" etc.`,
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
        content: `Hier is de receptinformatie gevonden op ${url}:\n\n${fullText}\n\nRetourneer dit als een enkel JSON-object volgens het opgegeven schema. Zorg dat ELKE ingrediënt een hoeveelheid en eenheid heeft als die beschikbaar is. Zorg dat image_url wordt ingevuld als je een afbeelding hebt gevonden. Let op: als er een aantal porties/personen vermeld wordt (bijv. "Twee personen", "4 porties", "Voor 2 personen"), vul dan basis_porties in als getal. ALLEEN JSON, geen andere tekst.`,
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
