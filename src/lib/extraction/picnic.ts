import { normalizeUnit } from "./scrape";

/**
 * Picnic (picnic.app) rendert receptpagina's client-side: de zichtbare HTML
 * bevat alleen koppen ("Ingrediënten", "Bereiding"). Het volledige recept zit
 * als JSON in de Next.js RSC-payload (`self.__next_f.push([1, "..."])`).
 * extractCleanText gooit <script>-tags weg, dus Claude kreeg nooit de inhoud
 * te zien. Deze parser leest het receptobject direct uit — geen LLM nodig.
 */

const PICNIC_IMAGE_BASE = "https://storefront-prod.nl.picnicinternational.com/static/images/recipes";

export function isPicnicUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "picnic.app" || host.endsWith(".picnic.app");
  } catch {
    return false;
  }
}

/** Plak alle RSC-chunks aan elkaar tot één gedecodeerde string. */
function readRscPayload(html: string): string {
  let payload = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      payload += JSON.parse(m[1]);
    } catch {
      // Kapotte chunk overslaan; de rest kan nog bruikbaar zijn.
    }
  }
  return payload;
}

/** Zoek het JSON-object dat `anchorIndex` omsluit en parse het. */
function parseEnclosingObject(payload: string, anchorIndex: number): any | null {
  let depth = 0;
  let start = anchorIndex;
  for (; start >= 0; start--) {
    const c = payload[start];
    if (c === "}") depth++;
    else if (c === "{") {
      if (depth === 0) break;
      depth--;
    }
  }
  if (start < 0) return null;

  // Tel accolades buiten strings, zodat een "}" in een bereidingstekst niet telt.
  depth = 0;
  let inString = false;
  for (let end = start; end < payload.length; end++) {
    const c = payload[end];
    if (inString) {
      if (c === "\\") end++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(payload.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Picnic markeert hoeveelheden in stappen met **vet** (markdown). */
function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\s+/g, " ").trim();
}

function formatMinutes(min: unknown): string | null {
  const n = typeof min === "number" ? min : parseInt(String(min ?? ""), 10);
  if (!n || isNaN(n) || n <= 0) return null;
  const hours = Math.floor(n / 60);
  const minutes = n % 60;
  if (hours > 0 && minutes > 0) return `${hours} uur ${minutes} min`;
  if (hours > 0) return `${hours} uur`;
  return `${minutes} min`;
}

/**
 * Haal een Picnic-recept uit de HTML. Geeft null als het receptobject niet
 * gevonden wordt (bijv. omdat Picnic de paginastructuur heeft veranderd) —
 * de aanroeper valt dan terug op de bestaande extractieroute.
 */
export function extractPicnicRecipe(html: string, ogImage: string | null) {
  const payload = readRscPayload(html);
  const anchor = payload.indexOf('"preparationInstructions"');
  if (anchor < 0) return null;

  const r = parseEnclosingObject(payload, anchor);
  if (!r || !Array.isArray(r.ingredients) || !Array.isArray(r.preparationInstructions)) return null;

  // CORE/CORE_STOCKABLE = vaste ingrediënten, HIDDEN_CUPBOARD = voorraadkast
  // (peper, zout), VARIATION = keuze-opties (bijv. soort brood).
  // COMPLEMENTARY zijn wijnsuggesties — geen ingrediënt, dus overslaan.
  const ingredients = r.ingredients
    .filter((i: any) => i?.name && i.type !== "COMPLEMENTARY")
    .map((i: any) => {
      const qty = i.displayIngredientQuantity;
      const naam = [i.name, i.displayTextSuffix].filter(Boolean).join(" ");
      return {
        hoeveelheid: qty != null && qty !== 0 ? String(qty) : null,
        eenheid: normalizeUnit(i.displayUnitOfMeasurement ?? null),
        naam: i.type === "VARIATION" ? `${naam} (naar keuze)` : naam,
      };
    });

  const steps = r.preparationInstructions
    .filter((s: any) => s?.type === "STEP" && typeof s.body === "string")
    .map((s: any) => {
      const header = typeof s.header === "string" ? s.header.trim() : "";
      return {
        titel: header && !/^stap\s*\d+$/i.test(header) ? header : null,
        beschrijving: stripMarkdown(s.body),
      };
    });

  const tips = r.preparationInstructions
    .filter((s: any) => s?.type === "TIP" && typeof s.body === "string")
    .map((s: any) => stripMarkdown(s.body));

  const allStepText = steps.map((s: any) => s.beschrijving).join(" ");
  const tempMatch = allStepText.match(/(\d{2,3})\s*°?\s*[Cc](?:\s*(hetelucht|boven[\s/-]?onderwarmte|graden|grillen))?/);

  return {
    title: typeof r.name === "string" ? r.name : "",
    subtitle: r.description || null,
    image_url: ogImage || (r.imageId ? `${PICNIC_IMAGE_BASE}/${r.imageId}/filled-600x600.webp` : null),
    tijd: formatMinutes(r.preparationTimeInMinutes),
    moeilijkheid: null,
    bron: "Picnic",
    // Picnic zet het aantal porties niet op de webpagina, maar recepten zijn
    // standaard voor 2 personen (de hoeveelheden in de payload horen daarbij).
    basis_porties: 2,
    categorie: null,
    temperatuur: tempMatch ? `${tempMatch[1]}°C${tempMatch[2] ? ` ${tempMatch[2]}` : ""}` : null,
    ingredients,
    steps,
    nutrition: null,
    tags: null,
    weetje: tips.length > 0 ? tips.join(" ") : null,
    allergenen: null,
    benodigdheden: null,
  };
}
