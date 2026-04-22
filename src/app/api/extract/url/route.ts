import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
import {
  EXTRACTION_SYSTEM_PROMPT,
  parseRecipeResponse,
} from "@/lib/extraction/prompt";
import { scrapePage, jsonLdToRecipe, detectBronFromUrl } from "@/lib/extraction/scrape";
import { getCachedRecipe, setCachedRecipe } from "@/lib/extraction/cache";
import { validateRecipe } from "@/lib/extraction/validate";
import { uploadExternalImage, findOgImageDirectly } from "@/lib/extraction/image-upload";

function detectSocialPlatform(url: string): string | null {
  const hostname = new URL(url).hostname.replace('www.', '');
  if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) return 'instagram';
  if (hostname.includes('tiktok.com')) return 'tiktok';
  if (hostname.includes('facebook.com') || hostname.includes('fb.com') || hostname.includes('fb.watch')) return 'facebook';
  if (hostname.includes('pinterest.com') || hostname.includes('pin.it')) return 'pinterest';
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
  return null;
}

async function finalize(recipe: any, url: string) {
  // Last-resort image lookup: when the main pipeline couldn't find one
  // (scrapePage failed AND Claude web search didn't return a URL), try to
  // pull the og:image meta tag directly from the page.
  if (!recipe.image_url) {
    const og = await findOgImageDirectly(url);
    if (og) {
      console.log('[URL Extract] og:image fallback found:', og);
      recipe.image_url = og;
    }
  }

  // Absolute last resort: some sources (e.g. eefkooktzo.nl) block Vercel's IP
  // range at the Cloudflare edge, so every direct fetch returns 403. Anthropic's
  // web_search tool runs on their own infra and reaches these sites fine — ask
  // Claude to find just the image URL.
  if (!recipe.image_url && recipe.title) {
    const claudeImage = await findImageViaWebSearch(url, recipe.title);
    if (claudeImage) {
      console.log('[URL Extract] Claude web-search image found:', claudeImage);
      recipe.image_url = claudeImage;
    }
  }

  // Persist external images in Supabase Storage so hotlink-protected sources
  // (Cloudflare, Jetpack, etc. — e.g. eefkooktzo.nl) still render in the app.
  if (
    recipe.image_url &&
    !recipe.image_url.startsWith("data:") &&
    !recipe.image_url.includes("/storage/v1/object/public/")
  ) {
    const stored = await uploadExternalImage(recipe.image_url, url);
    if (stored) recipe.image_url = stored;
  }
  setCachedRecipe(url, recipe);
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
      return finalize(recipe, url);
    }

    // Hash-based SPA detection (e.g. app.projectgezond.nl/#/recepten/...)
    // Direct fetch/puppeteer can't render these on Vercel — use web search
    if (url.includes('#/') || url.includes('#!')) {
      console.log(`[URL Extract] Hash-based SPA detected, using web search`);
      const recipe = await fallbackWebSearch(url, true);
      if (!recipe.bron) recipe.bron = detectBronFromUrl(url);
      recipe._hashSPA = true;
      return finalize(recipe, url);
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

      return finalize(recipe, url);
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

      return finalize(recipe, url);
    }

    // Step 3: No JSON-LD — use Claude to extract from page text
    console.log("[URL Extract] No JSON-LD, using Claude on page text");
    try {
      return await extractWithClaude(scraped.pageText, url, scraped.ogImage);
    } catch (claudeError: any) {
      console.log("[URL Extract] Claude page-text extraction failed:", claudeError.message, "— trying web search");
      const recipe = await fallbackWebSearch(url);
      return finalize(recipe, url);
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

/**
 * Last-resort image lookup via Claude's web_search tool. Runs on Anthropic's
 * infrastructure, so it reaches sites that IP-block Vercel (eefkooktzo.nl).
 * Returns a direct image URL or null.
 *
 * Hard constraint: the image MUST belong to the recipe on the source page.
 * Accept only URLs on the source hostname itself or on a WordPress Jetpack
 * CDN that serves this source's own media (i[0-9]+.wp.com/<source-host>/...).
 * Never accept images from Pinterest, Instagram, or random third-party sites.
 */
async function findImageViaWebSearch(pageUrl: string, title: string): Promise<string | null> {
  // Hard time budget — fallbackWebSearch can already take 30-40s, and we must
  // stay under Vercel's 60s maxDuration. If Claude doesn't return in 15s,
  // abort and let the recipe save without an image.
  const TIMEOUT_MS = 15000;
  return await Promise.race([
    findImageViaWebSearchInner(pageUrl, title),
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.log('[URL Extract] Claude image search timed out');
        resolve(null);
      }, TIMEOUT_MS),
    ),
  ]);
}

async function findImageViaWebSearchInner(pageUrl: string, title: string): Promise<string | null> {
  try {
    const client = new Anthropic();
    const parsedPage = new URL(pageUrl);
    const hostname = parsedPage.hostname.replace(/^www\./, '');

    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        `Je enige taak: de og:image-URL van deze specifieke receptpagina op ${hostname} terugvinden. Gebruik je web_search tool om de pagina zelf op te halen en de <meta property="og:image"> tag uit de HTML te lezen. Retourneer UITSLUITEND geldig JSON: {"image_url": "https://..."} of {"image_url": null} als je niks betrouwbaars vindt. Geen uitleg, geen markdown, alleen JSON.`,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [
        {
          role: 'user',
          content: `Vind de og:image van deze exacte pagina:
${pageUrl}

Receptnaam: "${title}"

STAP 1: Gebruik web_search met de volledige URL "${pageUrl}" als query. De tool kan de pagina ophalen (draait op andere infrastructuur dan ons).
STAP 2: Zoek in de HTML naar een van deze meta tags:
  <meta property="og:image" content="https://..." />
  <meta property="og:image:secure_url" content="https://..." />
  <meta name="twitter:image" content="https://..." />
  <link rel="image_src" href="https://..." />
STAP 3: Retourneer de URL uit content of href.

HARDE REGELS voor de geretourneerde URL:
- MOET de foto zijn die bij DIT recept hoort op ${hostname} (niet een ander recept, niet een andere site).
- MOET gehost zijn op ${hostname} zelf (bijv. ${hostname}/wp-content/uploads/...) OF op een WordPress Jetpack-CDN (i0.wp.com/${hostname}/..., i1.wp.com/${hostname}/...).
- NOOIT Pinterest, Instagram, Facebook, Twitter, stock-sites, of random andere websites.
- NOOIT een generieke/stockfoto, alleen de specifieke foto van DEZE receptpagina.

Als je de pagina niet kunt bereiken of geen og:image vindt: retourneer {"image_url": null}. Retourneer ALLEEN JSON — niks anders.`,
        },
      ],
    });

    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n');

    const match = text.match(/\{[^{}]*"image_url"[^{}]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const img = parsed?.image_url;
    if (typeof img !== 'string' || !/^https?:\/\//i.test(img)) return null;

    // Validate origin: must come from the source hostname or a WordPress
    // Jetpack CDN that serves this source's own media. Everything else is
    // rejected to avoid pulling unrelated images from other sites.
    try {
      const imgUrl = new URL(img);
      const imgHost = imgUrl.hostname.replace(/^www\./, '');
      const sourceHost = hostname;
      const isSameHost = imgHost === sourceHost || imgHost.endsWith('.' + sourceHost);
      const isJetpackCdn =
        /^i\d+\.wp\.com$/i.test(imgHost) &&
        (imgUrl.pathname.includes(`/${sourceHost}/`) || imgUrl.pathname.includes(`/www.${sourceHost}/`));
      if (!isSameHost && !isJetpackCdn) {
        console.log(`[URL Extract] Rejected image from unrelated host: ${imgHost}`);
        return null;
      }
    } catch {
      return null;
    }

    return img;
  } catch (err: any) {
    console.log('[URL Extract] Claude image search failed:', err.message);
    return null;
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

  return finalize(recipe, url);
}

async function fallbackWebSearch(url: string, quick = false): Promise<any> {
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
        max_uses: quick ? 3 : 8,
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
- Voedingswaarden ALLEEN als ze direct zichtbaar zijn — zoek er NIET extra naar, die worden later automatisch berekend

Als het recept in het Engels is, vertaal dan alles naar het Nederlands.`,
      },
    ],
  });

  const searchText = searchResponse.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  // If no quantities found in first search, do a targeted ingredient search (skip in quick mode)
  const hasQuantities = /\d+\s*(gram|g|ml|el|tl|eetlepel|theelepel|stuk|stuks|ui|eieren?|teen)/i.test(searchText);
  let extraIngredientText = "";
  if (!hasQuantities && !quick) {
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
