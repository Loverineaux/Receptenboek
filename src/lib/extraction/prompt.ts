export const EXTRACTION_SYSTEM_PROMPT = `Je bent een gespecialiseerde receptextractor. Je taak is om receptgegevens uit de aangeleverde bron te extraheren en te retourneren als een enkel JSON-object.

REGELS:
- Alle tekst moet in het Nederlands zijn.
- Detecteer automatisch de bron (website-naam) uit de URL of inhoud.
- Combineer ALLE ingrediënten in één lijst. Maak GEEN onderscheid tussen "uit de box" en "zelf toevoegen" of vergelijkbare splitsingen.
- Neem voedingswaarden per portie op wanneer beschikbaar.
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
  "tags": ["string"] | null
}

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

  const parsed = JSON.parse(jsonStr) as ExtractedRecipe;

  // Basic validation
  if (!parsed.title || typeof parsed.title !== "string") {
    throw new Error("Extracted recipe is missing a valid title");
  }
  if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
    throw new Error("Extracted recipe has no ingredients");
  }
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Extracted recipe has no steps");
  }

  return parsed;
}
