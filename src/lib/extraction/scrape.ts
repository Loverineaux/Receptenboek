/**
 * Fetch a recipe page and extract structured data + raw HTML.
 * Strategy:
 *   1. Try JSON-LD (schema.org/Recipe) — most reliable
 *   2. Try microdata / meta tags (og:image, etc.)
 *   3. Fall back to raw HTML text for Claude
 */

const FETCH_TIMEOUT = 15000;

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Full browser-like headers that pass most bot detection
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": CHROME_UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "max-age=0",
  "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

interface ScrapedRecipe {
  /** JSON-LD recipe data if found */
  jsonLd: any | null;
  /** Open Graph / meta image */
  ogImage: string | null;
  /** Cleaned page text for Claude fallback */
  pageText: string;
  /** Raw HTML (truncated) for Claude if needed */
  rawHtml: string;
  /** Page title */
  pageTitle: string;
}

export async function scrapePage(url: string): Promise<ScrapedRecipe> {
  // Strategy 1: Direct fetch with full browser headers (fast)
  const directResult = await tryFetch(url, BROWSER_HEADERS);
  if (directResult) return directResult;

  // Strategy 2: Headless browser (bypasses Cloudflare JS challenge)
  console.log("[Scrape] Direct fetch failed, trying headless browser...");
  const browserResult = await tryHeadlessBrowser(url);
  if (browserResult) return browserResult;

  throw new Error("Pagina niet bereikbaar (geblokkeerd door bot-detectie)");
}

async function tryHeadlessBrowser(url: string): Promise<ScrapedRecipe | null> {
  try {
    const puppeteer = await import("puppeteer-core");
    const fs = await import("fs");

    // Find browser executable
    const paths = [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
    ];
    const execPath = paths.find((p) => fs.existsSync(p));
    if (!execPath) {
      console.log("[Scrape] No browser found for headless scraping");
      return null;
    }

    const browser = await puppeteer.default.launch({
      executablePath: execPath,
      headless: "new" as any,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(CHROME_UA);
      await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

      const html = await page.content();

      if (html.length < 5000 && (html.includes("Just a moment") || html.includes("Checking your browser"))) {
        console.log("[Scrape] Headless browser also blocked by Cloudflare");
        return null;
      }

      console.log(`[Scrape] Headless browser success: ${html.length} bytes`);
      return parseHtml(html, url);
    } finally {
      await browser.close();
    }
  } catch (err: any) {
    console.log("[Scrape] Headless browser error:", err.message);
    return null;
  }
}

async function tryFetch(url: string, headers: Record<string, string>): Promise<ScrapedRecipe | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();

    // Check for Cloudflare challenge
    if (html.length < 5000 && (html.includes("Just a moment") || html.includes("Checking your browser"))) {
      console.log("[Scrape] Cloudflare challenge detected");
      return null;
    }

    // Check for Google "not in cache" page
    if (html.includes("cache:") && html.includes("not available") && html.length < 3000) {
      return null;
    }

    return parseHtml(html, url);
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function parseHtml(html: string, url: string): ScrapedRecipe {
  // 1. Extract JSON-LD
  const jsonLd = extractJsonLd(html);

  // 2. Extract OG image
  const ogImage = extractMetaContent(html, 'property="og:image"')
    || extractMetaContent(html, 'name="og:image"')
    || extractImageFromJsonLd(jsonLd);

  // 3. Page title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : "";

  // 4. Clean text for Claude fallback
  const pageText = extractCleanText(html);

  // 5. Truncated raw HTML (keep relevant parts)
  const rawHtml = html.length > 50000 ? html.substring(0, 50000) : html;

  return { jsonLd, ogImage, pageText, rawHtml, pageTitle };
}

function extractJsonLd(html: string): any | null {
  // Find all <script type="application/ld+json"> blocks
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());

      // Could be a single object or an array
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Direct Recipe type
        if (item["@type"] === "Recipe" || item["@type"]?.includes?.("Recipe")) {
          return item;
        }

        // Nested in @graph
        if (item["@graph"] && Array.isArray(item["@graph"])) {
          const recipe = item["@graph"].find(
            (g: any) => g["@type"] === "Recipe" || g["@type"]?.includes?.("Recipe")
          );
          if (recipe) return recipe;
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return null;
}

function extractImageFromJsonLd(jsonLd: any): string | null {
  if (!jsonLd) return null;
  const img = jsonLd.image;
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return typeof img[0] === "string" ? img[0] : img[0]?.url ?? null;
  if (img.url) return img.url;
  return null;
}

function extractMetaContent(html: string, attr: string): string | null {
  // Match <meta property="og:image" content="..."> in any attribute order
  const regex = new RegExp(
    `<meta[^>]*${attr.replace(/"/g, '"')}[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*/?>|` +
    `<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*${attr.replace(/"/g, '"')}[^>]*/?>`,
    "i"
  );
  const match = html.match(regex);
  return match ? (match[1] || match[2] || null) : null;
}

function extractCleanText(html: string): string {
  // Remove script, style, nav, footer, header
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "");

  // Replace tags with spaces
  text = text.replace(/<[^>]+>/g, " ");

  // Decode entities
  text = decodeHtmlEntities(text);

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Truncate
  return text.length > 15000 ? text.substring(0, 15000) : text;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Convert schema.org/Recipe JSON-LD to our recipe format.
 */
export function jsonLdToRecipe(ld: any, ogImage: string | null) {
  const title = ld.name || "";
  const description = ld.description || null;

  // Image
  let image_url = ogImage;
  if (!image_url) {
    const img = ld.image;
    if (typeof img === "string") image_url = img;
    else if (Array.isArray(img)) image_url = typeof img[0] === "string" ? img[0] : img[0]?.url;
    else if (img?.url) image_url = img.url;
  }

  // Time — try each field, skip if it parses to null (0 min)
  let tijd: string | null = null;
  for (const field of [ld.totalTime, ld.cookTime, ld.prepTime]) {
    if (field) {
      const parsed = parseIsoDuration(field);
      if (parsed) {
        tijd = parsed;
        break;
      }
    }
  }

  // Servings
  let basis_porties: number | null = null;
  const yield_ = ld.recipeYield;
  if (yield_) {
    const num = Array.isArray(yield_) ? yield_[0] : yield_;
    const parsed = parseInt(String(num), 10);
    if (!isNaN(parsed)) basis_porties = parsed;
  }

  // Ingredients
  const ingredients = (ld.recipeIngredient || []).map((ing: string) => {
    const parsed = parseIngredientString(ing);
    return parsed;
  });

  // Steps
  const steps = parseInstructions(ld.recipeInstructions);

  // Nutrition
  let nutrition = null;
  if (ld.nutrition) {
    const n = ld.nutrition;
    nutrition = {
      energie_kcal: n.calories ? String(n.calories).replace(/[^\d.]/g, "") : null,
      vetten: n.fatContent ? String(n.fatContent).replace(/[^\d.]/g, "") : null,
      verzadigd: n.saturatedFatContent ? String(n.saturatedFatContent).replace(/[^\d.]/g, "") : null,
      koolhydraten: n.carbohydrateContent ? String(n.carbohydrateContent).replace(/[^\d.]/g, "") : null,
      suikers: n.sugarContent ? String(n.sugarContent).replace(/[^\d.]/g, "") : null,
      vezels: n.fiberContent ? String(n.fiberContent).replace(/[^\d.]/g, "") : null,
      eiwitten: n.proteinContent ? String(n.proteinContent).replace(/[^\d.]/g, "") : null,
      zout: n.sodiumContent ? String(n.sodiumContent).replace(/[^\d.]/g, "") : null,
    };
  }

  // Category / tags
  const category = ld.recipeCategory || null;
  const tags: string[] = [];
  if (ld.keywords) {
    const kw = typeof ld.keywords === "string" ? ld.keywords.split(",") : ld.keywords;
    tags.push(...kw.map((k: string) => k.trim()).filter(Boolean));
  }

  // Detect source: prefer publisher (site name) over author (person name)
  let bron: string | null = null;
  if (ld.publisher) {
    bron = typeof ld.publisher === "string" ? ld.publisher : ld.publisher?.name || null;
  }
  // Don't use author as bron — it's usually a person's name, not a website

  return {
    title,
    subtitle: description,
    image_url,
    tijd,
    moeilijkheid: null,
    bron,
    basis_porties,
    categorie: category,
    ingredients,
    steps,
    nutrition,
    tags: tags.length > 0 ? tags : null,
    weetje: null,
    allergenen: null,
    benodigdheden: null,
  };
}

function parseIsoDuration(iso: any): string | null {
  if (typeof iso !== "string") return null;
  // PT30M, PT1H30M, PT45M, etc.
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  if (hours === 0 && minutes === 0) return null;
  if (hours > 0 && minutes > 0) return `${hours} uur ${minutes} min`;
  if (hours > 0) return `${hours} uur`;
  return `${minutes} min`;
}

function parseIngredientString(text: any) {
  if (typeof text !== "string") {
    // Handle object ingredients (some JSON-LD formats)
    if (text && typeof text === "object") {
      return {
        hoeveelheid: text.amount || text.quantity || null,
        eenheid: text.unit || text.unitText || null,
        naam: text.name || text.ingredient || JSON.stringify(text),
      };
    }
    return { hoeveelheid: null, eenheid: null, naam: String(text || "") };
  }
  // Try to split "200 g kipfilet" into hoeveelheid/eenheid/naam
  const match = text.match(
    /^([\d.,/½¼¾⅓⅔⅛]+)\s*(g|kg|ml|l|dl|cl|el|tl|eetlepel|theelepel|stuks?|plakjes?|sneetjes?|blaadjes?|tenen?|takjes?|snufje|scheut|blik(?:jes?)?|zakjes?|potjes?|beker|cup|oz|lb|tbsp|tsp|stuk)?\s+(.+)/i
  );
  if (match) {
    return {
      hoeveelheid: match[1],
      eenheid: match[2] || null,
      naam: match[3].trim(),
    };
  }
  return { hoeveelheid: null, eenheid: null, naam: text.trim() };
}

function parseInstructions(instructions: any): Array<{ titel: string | null; beschrijving: string }> {
  if (!instructions) return [];

  // String
  if (typeof instructions === "string") {
    return instructions
      .split(/\n+/)
      .filter(Boolean)
      .map((s) => ({ titel: null, beschrijving: s.trim() }));
  }

  // Array
  if (Array.isArray(instructions)) {
    const result: Array<{ titel: string | null; beschrijving: string }> = [];

    for (const item of instructions) {
      if (typeof item === "string") {
        result.push({ titel: null, beschrijving: item.trim() });
      } else if (item["@type"] === "HowToStep") {
        result.push({
          titel: item.name || null,
          beschrijving: item.text || item.description || "",
        });
      } else if (item["@type"] === "HowToSection") {
        // Section with sub-steps
        const sectionName = item.name || null;
        const subSteps = item.itemListElement || [];
        for (const sub of subSteps) {
          result.push({
            titel: sectionName,
            beschrijving: typeof sub === "string" ? sub : sub.text || sub.description || "",
          });
        }
      }
    }
    return result;
  }

  return [];
}

/** Map common hostnames to nice display names. */
const HOSTNAME_MAP: Record<string, string> = {
  "ah.nl": "Albert Heijn",
  "ah.be": "Albert Heijn",
  "jumbo.com": "Jumbo",
  "plus.nl": "Plus",
  "recepten.lidl.nl": "Lidl",
  "picnic.app": "Picnic",
  "colruyt.be": "Colruyt",
  "delhaize.be": "Delhaize",
  "carrefour.be": "Carrefour",
  "hellofresh.nl": "HelloFresh",
  "hellofresh.be": "HelloFresh",
  "marleyspoon.nl": "Marley Spoon",
  "gousto.co.uk": "Gousto",
  "everyplate.com": "EveryPlate",
  "dinnerly.com": "Dinnerly",
  "homechef.com": "Home Chef",
  "lekkerensimpel.com": "Lekker en Simpel",
  "leukerecepten.nl": "Leuke Recepten",
  "ohmyfoodness.nl": "Ohmyfoodness",
  "francescakookt.nl": "Francesca Kookt",
  "brendakookt.nl": "Brenda Kookt",
  "miljuschka.nl": "Miljuschka",
  "uitpaulineskeuken.nl": "Uit Pauline's Keuken",
  "chickslovefood.com": "Chickslovefood",
  "eefkooktzo.nl": "Eef Kookt Zo",
  "culy.nl": "Culy",
  "dagelijksekost.vrt.be": "Dagelijkse Kost",
  "njam.tv": "Njam!",
  "libelle-lekker.be": "Libelle Lekker",
  "lekkervanbijons.be": "Lekker van bij Ons",
  "kokerellen.be": "Kokerellen",
  "hap-en-tap.be": "Hap & Tap",
  "24kitchen.nl": "24Kitchen",
  "eatertainment.nl": "Eatertainment",
  "lekkermakkelijk.nl": "Lekkermakkelijk",
};

export function detectBronFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (HOSTNAME_MAP[hostname]) return HOSTNAME_MAP[hostname];
    // Try matching without subdomain
    const parts = hostname.split(".");
    const domain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;
    if (HOSTNAME_MAP[domain]) return HOSTNAME_MAP[domain];
    // Capitalize domain name as fallback
    return domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
  } catch {
    return "Onbekend";
  }
}
