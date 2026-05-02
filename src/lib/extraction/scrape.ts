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

// Minimal headers — less likely to trigger bot detection on some CDNs
const SIMPLE_HEADERS: Record<string, string> = {
  "User-Agent": CHROME_UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9",
};

/**
 * Heuristic: does this URL look like a short-link that needs to be expanded
 * (e.g. ah.nl/r/abc123, jum.bo/x/...) or an already-canonical recipe URL
 * that should be left alone?
 *
 * AH allerhande full URLs trigger a server-side redirect to a *different*
 * recipe id when fetched with HEAD only — likely bot defense — and we
 * accidentally followed it, scraping the wrong page. Solution: only
 * resolve when the URL really looks short.
 */
function looksLikeShortUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname;
    // Path is just a /code or empty → likely a short URL
    if (path.length <= 12) return true;
    // Common short-redirect patterns
    if (/^\/r\/[\w-]+$/i.test(path)) return true; // ah.nl/r/123
    if (/^\/[a-z0-9]{4,12}$/i.test(path)) return true; // bit.ly/abc123 etc
    // Otherwise it has a real path — assume canonical
    return false;
  } catch {
    return false;
  }
}

/** Resolve short redirect URLs (e.g. ah.nl/r/123) to their final destination.
 *  Returns the input URL unchanged if it already looks canonical. */
async function resolveRedirects(url: string): Promise<string> {
  if (!looksLikeShortUrl(url)) {
    return url;
  }
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: SIMPLE_HEADERS,
    });
    if (res.url && res.url !== url) {
      console.log(`[Scrape] Resolved redirect: ${url} → ${res.url}`);
      return res.url;
    }
  } catch {}
  // Manual redirect following
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: SIMPLE_HEADERS,
    });
    const location = res.headers.get('location');
    if (location) {
      const resolved = location.startsWith('http') ? location : new URL(location, url).href;
      return resolveRedirects(resolved);
    }
  } catch {}
  return url;
}

export async function scrapePage(url: string): Promise<ScrapedRecipe> {
  // Resolve short/redirect URLs first (e.g. ah.nl/r/123 → full allerhande URL)
  const resolvedUrl = await resolveRedirects(url);

  // Strategy 1: Direct fetch with full browser headers (fast)
  const directResult = await tryFetch(resolvedUrl, BROWSER_HEADERS);
  if (directResult) return directResult;

  // Strategy 1b: Try with simpler headers (some CDNs block Sec-Fetch-* headers)
  console.log("[Scrape] Full headers failed, trying simple headers...");
  const simpleResult = await tryFetch(resolvedUrl, SIMPLE_HEADERS);
  if (simpleResult) return simpleResult;

  // Strategy 2: Headless browser (bypasses Cloudflare JS challenge)
  console.log("[Scrape] Simple headers failed, trying headless browser...");
  const browserResult = await tryHeadlessBrowser(resolvedUrl);
  if (browserResult) return browserResult;

  throw new Error("Pagina niet bereikbaar (geblokkeerd door bot-detectie)");
}

async function tryHeadlessBrowser(url: string): Promise<ScrapedRecipe | null> {
  try {
    let puppeteer: any;
    try {
      // Prefer puppeteer-extra with stealth plugin for Cloudflare bypass
      puppeteer = require("puppeteer-extra");
      const StealthPlugin = require("puppeteer-extra-plugin-stealth");
      puppeteer.use(StealthPlugin());
      console.log("[Scrape] Using puppeteer-extra with stealth");
    } catch {
      // Fall back to puppeteer-core
      puppeteer = await import("puppeteer-core");
      puppeteer = puppeteer.default;
      console.log("[Scrape] Using puppeteer-core (no stealth)");
    }

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

    const browser = await puppeteer.launch({
      executablePath: execPath,
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-blink-features=AutomationControlled"],
    });

    try {
      const page = await browser.newPage();

      // Strategy A: Direct navigation
      await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
      let html = await page.content();

      // If blocked by bot detection, try cookie warming: visit homepage first, then retry
      if (html.includes("Just a moment") || html.includes("Checking your browser")) {
        console.log("[Scrape] Bot detection detected, warming cookies via homepage...");
        const origin = new URL(url).origin;
        await page.goto(origin, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
        // Wait for challenge to resolve
        await new Promise((r) => setTimeout(r, 5000));

        const homeTitle = await page.title();
        if (!homeTitle.includes("moment") && !homeTitle.includes("Checking")) {
          console.log("[Scrape] Homepage loaded, cookie obtained. Navigating to recipe...");
          await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
          await new Promise((r) => setTimeout(r, 3000));
          html = await page.content();
        } else {
          console.log("[Scrape] Homepage also blocked");
        }
      }

      if (html.length < 5000 && (html.includes("Just a moment") || html.includes("Checking your browser"))) {
        console.log("[Scrape] Headless browser blocked even after cookie warming");
        return null;
      }

      console.log(`[Scrape] Headless browser success: ${html.length} bytes`);
      const result = parseHtml(html, url);

      // If we have an og:image, download it via the browser session (same cookies)
      // to avoid Cloudflare blocking when the frontend tries to load it
      if (result.ogImage) {
        try {
          console.log("[Scrape] Downloading og:image via browser session...");
          const base64Image = await page.evaluate(async (imgUrl: string) => {
            try {
              const res = await fetch(imgUrl);
              if (!res.ok) return null;
              const blob = await res.blob();
              return await new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
              });
            } catch { return null; }
          }, result.ogImage);

          if (base64Image && base64Image.startsWith("data:image")) {
            console.log(`[Scrape] Image downloaded: ${Math.round(base64Image.length / 1024)}KB`);
            result.ogImage = base64Image;
          }
        } catch (imgErr: any) {
          console.log("[Scrape] Image download failed:", imgErr.message);
        }
      }

      return result;
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

    const html = await res.text();

    // Some sites (e.g. eefkooktzo.nl) return 403 but still serve full HTML with JSON-LD
    // Only reject if truly empty or error page
    if (!res.ok && (html.length < 5000 || !html.includes("application/ld+json"))) {
      console.log(`[Scrape] HTTP ${res.status} with ${html.length} bytes — no structured data, skipping`);
      return null;
    }

    // Check for Cloudflare / Akamai / bot detection challenge pages
    if (html.length < 5000 && (html.includes("Just a moment") || html.includes("Checking your browser"))) {
      console.log("[Scrape] Cloudflare challenge detected");
      return null;
    }

    // Akamai bot detection — returns a small page with no real content
    if (html.length < 5000 && !html.includes("application/ld+json") && !html.includes("<article")) {
      console.log("[Scrape] Possible bot detection page (small response, no structured data)");
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
  // 1. Extract JSON-LD — pass the URL so the picker can prefer a recipe
  // whose @id/url matches the page (AH and others put related-recipe
  // JSON-LD blocks alongside the main one).
  const jsonLd = extractJsonLd(html, url);

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

function extractJsonLd(html: string, pageUrl?: string): any | null {
  // Some sites (AH allerhande, NYT Cooking, ...) embed multiple Recipe
  // JSON-LD blocks on the same page — main recipe + related/alternative
  // recipes. Picking the first one returns the wrong recipe. Collect them
  // all, then prefer the one whose @id or url matches the page URL.
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const recipes: any[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Recipe" || item["@type"]?.includes?.("Recipe")) {
          recipes.push(item);
        }
        if (item["@graph"] && Array.isArray(item["@graph"])) {
          for (const g of item["@graph"]) {
            if (g["@type"] === "Recipe" || g["@type"]?.includes?.("Recipe")) {
              recipes.push(g);
            }
          }
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  if (recipes.length === 0) return null;
  if (recipes.length === 1 || !pageUrl) return recipes[0];

  // Diagnostic: show every recipe block we found so a future mismatch is
  // debuggable from Vercel logs alone.
  console.log(
    `[Scrape] Found ${recipes.length} recipe blocks for ${pageUrl}:`,
    recipes.map((r) => ({
      name: typeof r.name === 'string' ? r.name : null,
      id: r['@id'] ?? null,
      url: r.url ?? null,
      mainEntityOfPage:
        typeof r.mainEntityOfPage === 'string'
          ? r.mainEntityOfPage
          : r.mainEntityOfPage?.['@id'] ?? null,
    })),
  );

  // Strategy 1: prefer the recipe whose @id/url/mainEntityOfPage matches the
  // current page URL (slug-level path compare).
  const pagePath = (() => {
    try {
      return new URL(pageUrl).pathname.replace(/\/+$/, '').toLowerCase();
    } catch {
      return pageUrl.toLowerCase();
    }
  })();

  const refsOf = (r: any): string[] => {
    const refs: string[] = [];
    if (typeof r['@id'] === 'string') refs.push(r['@id']);
    if (typeof r.url === 'string') refs.push(r.url);
    if (typeof r.mainEntityOfPage === 'string') refs.push(r.mainEntityOfPage);
    else if (r.mainEntityOfPage && typeof r.mainEntityOfPage['@id'] === 'string') {
      refs.push(r.mainEntityOfPage['@id']);
    }
    return refs;
  };

  const exactMatch = recipes.find((r) =>
    refsOf(r).some((ref) => {
      try {
        return new URL(ref).pathname.replace(/\/+$/, '').toLowerCase() === pagePath;
      } catch {
        return ref.toLowerCase().includes(pagePath);
      }
    }),
  );
  if (exactMatch) {
    console.log(`[Scrape] Exact-path match: "${exactMatch.name}"`);
    return exactMatch;
  }

  // Strategy 2: many sites embed a recipe id in the URL (AH: R-R1190830,
  // others: numeric, slugs). If we can extract identifier-shaped tokens
  // from the page URL, prefer a recipe whose refs contain the same token.
  const idTokens = pageUrl.match(/R-R\d+|[A-Za-z]+[-_]?\d{4,}/g) ?? [];
  if (idTokens.length > 0) {
    const tokenMatch = recipes.find((r) => {
      const refs = refsOf(r).join(' ').toLowerCase();
      return idTokens.some((t) => refs.includes(t.toLowerCase()));
    });
    if (tokenMatch) {
      console.log(`[Scrape] Id-token match (${idTokens.join(',')}): "${tokenMatch.name}"`);
      return tokenMatch;
    }
  }

  // Strategy 3: drop any recipe whose @id/url clearly points to a *different*
  // page than the one we're scraping. The remaining recipes either match or
  // have no identifier at all (probably the main recipe).
  const cleaned = recipes.filter((r) => {
    const refs = refsOf(r);
    if (refs.length === 0) return true;
    return refs.some((ref) => {
      try {
        const refPath = new URL(ref).pathname.replace(/\/+$/, '').toLowerCase();
        return refPath === pagePath || refPath === '' || refPath === '/';
      } catch {
        return true;
      }
    });
  });
  if (cleaned.length > 0 && cleaned.length < recipes.length) {
    console.log(
      `[Scrape] Filtered out ${recipes.length - cleaned.length} unrelated recipe(s); using "${cleaned[0].name}"`,
    );
    return cleaned[0];
  }

  console.log(`[Scrape] No recipe matched URL — falling back to first: "${recipes[0].name}"`);
  return recipes[0];
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
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Normalize curly/smart quotes to straight apostrophe for Dutch words like paprika's
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'");
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

  // Try to detect temperature from steps (oven/bbq/grill)
  let temperatuur: string | null = null;
  const allStepText = steps.map((s) => s.beschrijving).join(' ');
  const tempMatch = allStepText.match(/(\d{2,3})\s*°?\s*[Cc](?:\s*(hetelucht|boven[\s/-]?onderwarmte|graden|grillen))?/);
  if (tempMatch) {
    temperatuur = `${tempMatch[1]}°C${tempMatch[2] ? ` ${tempMatch[2]}` : ''}`;
  }

  return {
    title,
    subtitle: description,
    image_url,
    tijd,
    moeilijkheid: null,
    bron,
    basis_porties,
    categorie: category,
    temperatuur,
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

// Standardize unit abbreviations to full Dutch names
function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;
  const u = unit.toLowerCase().replace(/\.$/, '').trim();
  const map: Record<string, string> = {
    'g': 'gram', 'gr': 'gram', 'gram': 'gram',
    'kg': 'kg',
    'ml': 'ml', 'dl': 'dl', 'cl': 'cl', 'l': 'liter',
    'el': 'el', 'eetlepel': 'el', 'eetlepels': 'el',
    'tl': 'tl', 'theelepel': 'tl', 'theelepels': 'tl',
    'tbsp': 'el', 'tsp': 'tl',
    'stuk': 'stuk', 'stuks': 'stuk', 'st': 'stuk',
    'snuf': 'snuf', 'snufje': 'snuf', 'mespunt': 'snuf', 'mespuntje': 'snuf',
    'teen': 'teen', 'teentje': 'teen', 'teentjes': 'teen', 'tenen': 'teen',
    'tak': 'tak', 'takje': 'tak', 'takjes': 'tak',
    'bos': 'bos', 'bosje': 'bos',
    'scheut': 'scheut', 'scheutje': 'scheut',
    'handvol': 'handvol', 'handje': 'handvol',
    'plak': 'plak', 'plakje': 'plak', 'plakjes': 'plak',
    'snee': 'snee', 'sneetje': 'snee', 'sneetjes': 'snee',
    'blaadje': 'blaadje', 'blaadjes': 'blaadje',
    'blik': 'blik', 'blikje': 'blik', 'blikjes': 'blik',
    'zakje': 'zakje', 'zakjes': 'zakje',
    'potje': 'potje', 'potjes': 'potje',
    'beker': 'beker', 'cup': 'beker',
    'oz': 'oz', 'lb': 'lb',
  };
  return map[u] || unit;
}

function parseIngredientString(text: any) {
  if (typeof text !== "string") {
    if (text && typeof text === "object") {
      return {
        hoeveelheid: text.amount || text.quantity || null,
        eenheid: normalizeUnit(text.unit || text.unitText || null),
        naam: decodeHtmlEntities(text.name || text.ingredient || JSON.stringify(text)),
      };
    }
    return { hoeveelheid: null, eenheid: null, naam: String(text || "") };
  }

  // Decode HTML entities first (e.g. &#039; &apos; &rsquo; → ')
  const clean = decodeHtmlEntities(text);

  // Handle "snuf peper", "Snuf tijm", "snufje kaneel" — no number prefix
  const snufMatch = clean.match(/^(snuf|snufje|mespunt|mespuntje)\s+(.+)/i);
  if (snufMatch) {
    return { hoeveelheid: '1', eenheid: 'snuf', naam: snufMatch[2].trim() };
  }

  // Handle "naar smaak" items
  if (/naar smaak/i.test(clean)) {
    const cleanName = clean.replace(/,?\s*naar smaak/i, '').trim();
    return { hoeveelheid: null, eenheid: null, naam: cleanName ? `${cleanName} (naar smaak)` : clean.trim() };
  }

  // Quantity pattern: supports single numbers (2), decimals (1.5), fractions (½), ranges (1-2)
  const qtyPattern = '([\\d.,/½¼¾⅓⅔⅛]+(?:\\s*-\\s*[\\d.,/½¼¾⅓⅔⅛]+)?)';

  // Try to split "200 gr. kipfilet" into hoeveelheid/eenheid/naam
  const matchWithUnit = clean.match(
    new RegExp(
      `^${qtyPattern}\\s*(gr\\.?|g|kg|ml\\.?|l|dl|cl|el|tl|eetlepels?|theelepels?|stuks?|st\\.?|plakjes?|sneetjes?|blaadjes?|teentjes?|tenen?|takjes?|snufjes?|snuf|mespuntje?|scheutje?|scheut|handvol|handje|bosje?|blik(?:jes?)?|zakjes?|potjes?|beker|cup|oz|lb|tbsp|tsp|stuk)\\.?\\s+(.+)`,
      'i'
    )
  );
  if (matchWithUnit) {
    return {
      hoeveelheid: matchWithUnit[1].replace(/\s/g, ''),
      eenheid: normalizeUnit(matchWithUnit[2]),
      naam: matchWithUnit[3].trim(),
    };
  }

  // Handle "2 paprika's", "1 ui", "1-2 avocado's" — number + name without unit
  const matchNoUnit = clean.match(
    new RegExp(`^${qtyPattern}\\s+([a-zA-ZÀ-ÿ].+)`)
  );
  if (matchNoUnit) {
    return {
      hoeveelheid: matchNoUnit[1].replace(/\s/g, ''),
      eenheid: null,
      naam: matchNoUnit[2].trim(),
    };
  }

  return { hoeveelheid: null, eenheid: null, naam: clean.trim() };
}

function stripHtml(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ');
  return decodeHtmlEntities(text).replace(/\s+/g, ' ').trim();
}

function parseInstructions(instructions: any): Array<{ titel: string | null; beschrijving: string }> {
  if (!instructions) return [];

  // String
  if (typeof instructions === "string") {
    return instructions
      .split(/\n+/)
      .filter(Boolean)
      .map((s) => ({ titel: null, beschrijving: stripHtml(s) }));
  }

  // Array
  if (Array.isArray(instructions)) {
    const result: Array<{ titel: string | null; beschrijving: string }> = [];

    for (const item of instructions) {
      if (typeof item === "string") {
        result.push({ titel: null, beschrijving: stripHtml(item) });
      } else if (item["@type"] === "HowToStep") {
        const rawTitel = cleanStepTitel(item.name ? stripHtml(item.name) : null);
        const beschrijving = stripHtml(item.text || item.description || "");
        // If titel and beschrijving are (nearly) identical, drop the titel
        const titel = rawTitel && beschrijving &&
          (rawTitel === beschrijving || beschrijving.startsWith(rawTitel) || rawTitel.startsWith(beschrijving))
          ? null
          : rawTitel;
        result.push({ titel, beschrijving });
      } else if (item["@type"] === "HowToSection") {
        // Section with sub-steps
        const sectionName = cleanStepTitel(item.name ? stripHtml(item.name) : null);
        const subSteps = item.itemListElement || [];
        for (const sub of subSteps) {
          result.push({
            titel: sectionName,
            beschrijving: stripHtml(typeof sub === "string" ? sub : sub.text || sub.description || ""),
          });
        }
      }
    }
    return result;
  }

  return [];
}

/** Remove generic step numbering like "Stap 1", "Step 2" */
function cleanStepTitel(titel: string | null): string | null {
  if (!titel) return null;
  const cleaned = titel.replace(/^\s*(stap|step)\s*\d+\s*[.:\-]?\s*$/i, '').trim();
  const stripped = cleaned.replace(/^\s*(stap|step)\s*\d+\s*[.:\-]\s*/i, '').trim();
  return stripped || null;
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
  "projectgezond.nl": "Project Gezond",
  "app.projectgezond.nl": "Project Gezond",
  // Social media platforms
  "instagram.com": "Instagram",
  "instagr.am": "Instagram",
  "tiktok.com": "TikTok",
  "facebook.com": "Facebook",
  "fb.com": "Facebook",
  "fb.watch": "Facebook",
  "pinterest.com": "Pinterest",
  "pin.it": "Pinterest",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
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

/**
 * Normalize a free-form bron string. Handles the common "hostname vs nice
 * display name" drift (e.g. both "eefkooktzo.nl" and "Eef Kookt Zo" appearing
 * as separate filter options) by routing hostname-like strings through the
 * same HOSTNAME_MAP lookup as detectBronFromUrl. Non-hostname bronnen are
 * passed through unchanged so user-chosen names like "Eigen recept" stay.
 */
export function normalizeBron(bron: string | null | undefined): string | null {
  if (!bron) return null;
  const trimmed = bron.trim();
  if (!trimmed) return null;

  // Does it look like a hostname? e.g. "eefkooktzo.nl", "www.eefkooktzo.nl",
  // "https://eefkooktzo.nl/recept", "picnic.app"
  const looksLikeHostname = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/|$)/i.test(trimmed);
  if (!looksLikeHostname) return trimmed;

  try {
    const toParse = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const hostname = new URL(toParse).hostname.replace(/^www\./, "");
    if (HOSTNAME_MAP[hostname]) return HOSTNAME_MAP[hostname];
    const parts = hostname.split(".");
    const domain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;
    if (HOSTNAME_MAP[domain]) return HOSTNAME_MAP[domain];
  } catch {}

  return trimmed;
}
