import { normalizeUnit } from "./scrape";

/**
 * Albert Heijn (ah.nl/allerhande) zit achter Akamai, dat elke niet-browser
 * verbinding met "Access Denied" weigert — ook vanaf Vercel, ook met een
 * Googlebot-UA. De Appie-app haalt recepten uit AH's eigen GraphQL-API;
 * die is met een anoniem token bereikbaar en levert het volledige recept
 * gestructureerd aan. Zelfde bron (AH), dus geen LLM of web search nodig.
 */

const AH_API = "https://api.ah.nl";
const AH_HEADERS = {
  "User-Agent": "Appie/8.22.3",
  "Content-Type": "application/json",
};
const AH_TIMEOUT = 8000;

export function isAhUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "ah.nl" || host.endsWith(".ah.nl");
  } catch {
    return false;
  }
}

/** Recept-id uit ah.nl/r/1199336 of /allerhande/recept/R-R1199336/... */
export function extractAhRecipeId(url: string): number | null {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/r\/(\d+)(?:\/|$)/i) || path.match(/\/R-R(\d+)(?:\/|$)/i);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAnonymousToken(signal: AbortSignal): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const res = await fetch(`${AH_API}/mobile-auth/v1/auth/token/anonymous`, {
    method: "POST",
    headers: AH_HEADERS,
    body: JSON.stringify({ clientId: "appie" }),
    signal,
  });
  if (!res.ok) throw new Error(`AH token: HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.access_token) throw new Error("AH token: geen access_token");
  // Een minuut marge zodat een token niet halverwege een import verloopt.
  const ttl = Math.max(0, (Number(data.expires_in) || 0) - 60) * 1000;
  cachedToken = { value: data.access_token, expiresAt: Date.now() + ttl };
  return data.access_token;
}

const RECIPE_QUERY = `query Recipe($id: Int!) {
  recipe(id: $id) {
    title
    description
    servings { number }
    cookTime
    ovenTime
    waitTime
    images { url width }
    ingredients { name { singular plural } quantity quantityUnit { singular plural } text }
    preparation { steps }
    tags { key value }
    nutritions {
      energy { value unit }
      fat { value unit }
      saturatedFat { value unit }
      carbohydrates { value unit }
      sugar { value unit }
      fibers { value unit }
      protein { value unit }
      sodium { value unit }
    }
  }
}`;

function formatMinutes(total: number): string | null {
  if (!total || total <= 0) return null;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours > 0 && minutes > 0) return `${hours} uur ${minutes} min`;
  if (hours > 0) return `${hours} uur`;
  return `${minutes} min`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Grootste foto tot ~1200px breed: scherp genoeg, niet onnodig zwaar. */
function pickImage(images: any[] | null | undefined): string | null {
  const valid = (images || []).filter((i) => typeof i?.url === "string");
  if (valid.length === 0) return null;
  const fitting = valid.filter((i) => (i.width ?? 0) <= 1224);
  const pool = fitting.length > 0 ? fitting : valid;
  return pool.reduce((best, i) => ((i.width ?? 0) > (best.width ?? 0) ? i : best)).url;
}

function nutrientValue(n: any): string | null {
  return typeof n?.value === "number" ? String(n.value) : null;
}

/** Ingrediëntnaam en eenheid in enkelvoud of meervoud, zoals AH ze toont. */
function mapIngredient(i: any) {
  const qty = typeof i?.quantity === "number" && i.quantity > 0 ? i.quantity : null;
  const plural = qty !== null && qty !== 1;
  const name = (plural && i.name?.plural) || i.name?.singular || i.text || "";
  const unit = (plural && i.quantityUnit?.plural) || i.quantityUnit?.singular || null;
  return {
    hoeveelheid: qty !== null ? String(qty) : null,
    eenheid: normalizeUnit(unit || null),
    naam: name,
  };
}

/**
 * Haal een AH-recept op via de API. Geeft null als het niet lukt; de
 * aanroeper valt dan terug op de bestaande extractieroute.
 */
export async function fetchAhRecipe(id: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AH_TIMEOUT);
  try {
    const token = await getAnonymousToken(controller.signal);
    const res = await fetch(`${AH_API}/graphql`, {
      method: "POST",
      headers: { ...AH_HEADERS, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: RECIPE_QUERY, variables: { id } }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AH GraphQL: HTTP ${res.status}`);
    const data = await res.json();
    const r = data?.data?.recipe;
    if (!r?.title) {
      console.log("[AH] Geen recept in API-antwoord:", JSON.stringify(data?.errors ?? null).slice(0, 200));
      return null;
    }

    const steps = (r.preparation?.steps || [])
      .filter((s: unknown) => typeof s === "string" && s.trim())
      .map((s: string) => ({ titel: null, beschrijving: s.trim() }));

    const tags: { key: string; value: string }[] = Array.isArray(r.tags) ? r.tags : [];
    const menugang = tags.find((t) => t.key === "menugang")?.value;
    const tagValues = Array.from(new Set(
      tags
        .filter((t) => ["soort-gerecht", "speciale-wensen", "veel-gebruikt"].includes(t.key))
        .map((t) => capitalize(t.value)),
    ));

    const n = r.nutritions;
    // AH geeft natrium in mg; zout = natrium × 2,5.
    const sodiumMg = typeof n?.sodium?.value === "number" ? n.sodium.value : null;
    const nutrition = n
      ? {
          energie_kcal: nutrientValue(n.energy),
          energie_kj: null,
          vetten: nutrientValue(n.fat),
          verzadigd: nutrientValue(n.saturatedFat),
          koolhydraten: nutrientValue(n.carbohydrates),
          suikers: nutrientValue(n.sugar),
          vezels: nutrientValue(n.fibers),
          eiwitten: nutrientValue(n.protein),
          zout: sodiumMg !== null ? String(Math.round(sodiumMg * 2.5) / 1000) : null,
        }
      : null;

    const allStepText = steps.map((s: any) => s.beschrijving).join(" ");
    const tempMatch = allStepText.match(/(\d{2,3})\s*°?\s*[Cc](?:\s*(hetelucht|boven[\s/-]?onderwarmte|graden|grillen))?/);

    return {
      title: r.title,
      subtitle: r.description || null,
      image_url: pickImage(r.images),
      tijd: formatMinutes((r.cookTime || 0) + (r.ovenTime || 0) + (r.waitTime || 0)),
      moeilijkheid: null,
      bron: "Albert Heijn",
      basis_porties: typeof r.servings?.number === "number" ? r.servings.number : null,
      categorie: menugang ? capitalize(menugang) : null,
      temperatuur: tempMatch ? `${tempMatch[1]}°C${tempMatch[2] ? ` ${tempMatch[2]}` : ""}` : null,
      ingredients: (r.ingredients || []).map(mapIngredient).filter((i: any) => i.naam),
      steps,
      nutrition,
      tags: tagValues.length > 0 ? tagValues : null,
      weetje: null,
      allergenen: null,
      benodigdheden: null,
    };
  } catch (err: any) {
    console.log("[AH] API-fout:", err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
