export const EXTRACTION_SYSTEM_PROMPT = `Je bent een gespecialiseerde receptextractor. Je taak is om receptgegevens uit de aangeleverde bron te extraheren en te retourneren als een enkel JSON-object.

REGELS:
- ALLE tekst moet in het Nederlands zijn. Vertaal Engelstalige recepten volledig naar het Nederlands (titel, ingrediënten, stappen, alles).
- Detecteer automatisch de bron (website-naam) uit de URL of inhoud.
- Combineer ALLE ingrediënten in één lijst. Maak GEEN onderscheid tussen "uit de box" en "zelf toevoegen" of vergelijkbare splitsingen.
- Neem voedingswaarden per portie op wanneer beschikbaar. Zoek goed in de tekst naar calorieën, vetten, koolhydraten, eiwitten etc.
- Neem benodigdheden (keukengereedschap zoals bakvormen, deegrollers, pannen etc.) op wanneer vermeld.
- Als er een korte introductietekst of verhaaltje bij het recept staat, gebruik die als "subtitle".
- Retourneer UITSLUITEND geldig JSON. Geen uitleg, geen markdown, geen extra tekst. Alleen het JSON-object.

JSON SCHEMA:
{
  "title": "string (verplicht)",
  "subtitle": "string | null",
  "image_url": "string | null",
  "tijd": "string | null (bijv. '25 min')",
  "moeilijkheid": "'Makkelijk' | 'Gemiddeld' | 'Moeilijk' | null",
  "categorie": "string | null",
  "bron": "string | null (automatisch gedetecteerd)",
  "basis_porties": "number | null",
  "weetje": "string | null",
  "allergenen": "string | null",
  "ingredients": [
    {
      "hoeveelheid": "string | null",
      "eenheid": "string | null",
      "naam": "string (verplicht)"
    }
  ],
  "steps": [
    {
      "titel": "string | null",
      "beschrijving": "string (verplicht)",
      "afbeelding_url": "string | null"
    }
  ],
  "nutrition": {
    "energie_kcal": "string | null",
    "energie_kj": "string | null",
    "vetten": "string | null",
    "verzadigd": "string | null",
    "koolhydraten": "string | null",
    "suikers": "string | null",
    "vezels": "string | null",
    "eiwitten": "string | null",
    "zout": "string | null"
  } | null,
  "benodigdheden": [
    {
      "naam": "string (verplicht)"
    }
  ] | null,
  "tags": ["string"] | null,
  "categorieen": ["string"] | null
}

BELANGRIJK voor categorieen: Wijs een of meerdere van deze categorieën toe op basis van TITEL + INGREDIËNTEN:
- "Kip" — bevat kip/chicken/kipfilet/kippendij/drumstick
- "Vlees" — bevat rood vlees, gehakt, worst, spek, bacon, lam, shoarma, bifteki, köfte, chorizo, pulled pork (NIET kip)
- "Vis" — bevat vis of zeevruchten: zalm, tonijn, garnaal, kabeljauw, pangasius, forel, makreel, mosselen, calamaris. OOK als vis alleen in de titel staat!
- "Vegetarisch" — geen vlees, kip of vis. NIET toewijzen bij desserts/ontbijt/lunch/soepen.
- "Veganistisch" — geen dierlijke producten. NIET toewijzen bij desserts/ontbijt/lunch/soepen.
- "Pasta" — hoofdgerecht met pasta/noedels
- "Salade" — hoofdzakelijk een salade met sla/bladgroente als basis
- "Soep" — een soep
- "Dessert" — een zoet nagerecht
- "Ontbijt" — een ontbijtgerecht (bowl, overnight oats, etc.)
- "Lunch" — een lichte maaltijd (broodje, wrap, tosti, sandwich). GEEN warme maaltijden.
Wijs ALLE categorieën toe die van toepassing zijn. Een kipgerecht is zowel "Kip" als eventueel "Pasta" als het een pasta met kip is.

Retourneer ALLEEN het JSON-object. Geen andere tekst.`;

export interface ExtractedIngredient {
  hoeveelheid?: string;
  eenheid?: string;
  naam: string;
}

export interface ExtractedStep {
  titel?: string;
  beschrijving: string;
  afbeelding_url?: string;
}

export interface ExtractedNutrition {
  energie_kcal?: string;
  energie_kj?: string;
  vetten?: string;
  verzadigd?: string;
  koolhydraten?: string;
  suikers?: string;
  vezels?: string;
  eiwitten?: string;
  zout?: string;
}

export interface ExtractedRecipe {
  title: string;
  subtitle?: string;
  image_url?: string;
  tijd?: string;
  moeilijkheid?: "Makkelijk" | "Gemiddeld" | "Moeilijk";
  categorie?: string;
  bron?: string;
  basis_porties?: number;
  weetje?: string;
  allergenen?: string;
  ingredients: ExtractedIngredient[];
  steps: ExtractedStep[];
  nutrition?: ExtractedNutrition;
  benodigdheden?: Array<{ naam: string }>;
  tags?: string[];
}

/**
 * Parse Claude's response text to extract the JSON recipe object.
 * Handles responses wrapped in ```json ... ``` code blocks or plain JSON.
 */
export function parseRecipeResponse(responseText: string): ExtractedRecipe {
  let jsonStr = responseText.trim();

  // Try to extract from ```json ... ``` code block
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to extract a JSON object if there's surrounding text
  if (!jsonStr.startsWith("{")) {
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
  }

  let parsed: ExtractedRecipe;
  try {
    parsed = JSON.parse(jsonStr) as ExtractedRecipe;
  } catch {
    // If JSON parsing fails, Claude might have returned text instead of JSON.
    // Try to find any JSON object in the response.
    const lastTry = responseText.match(/\{[\s\S]*"title"[\s\S]*\}/);
    if (lastTry) {
      parsed = JSON.parse(lastTry[0]) as ExtractedRecipe;
    } else {
      throw new Error(`Kon geen recept-JSON vinden in het antwoord`);
    }
  }

  // Ensure title exists
  if (!parsed.title || typeof parsed.title !== "string" || parsed.title.trim() === "") {
    // Try common fallback fields
    parsed.title = parsed.name || parsed.headline || null;
    if (!parsed.title) {
      throw new Error("Extracted recipe is missing a valid title");
    }
  }

  // Ensure arrays exist (don't fail — let user fill in missing data)
  if (!Array.isArray(parsed.ingredients)) {
    parsed.ingredients = [];
  }
  if (!Array.isArray(parsed.steps)) {
    parsed.steps = [];
  }

  return parsed;
}
