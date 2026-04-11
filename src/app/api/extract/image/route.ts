import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
import { parseRecipeResponse } from "@/lib/extraction/prompt";

const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

const MAX_SIZE_PER_IMAGE = 20 * 1024 * 1024; // 20MB per image

const IMAGE_EXTRACTION_PROMPT = `Je bent een expert receptextractor met perfect oog voor detail. Je krijgt 1 of meerdere foto's die samen een recept vormen.

DE FOTO'S KUNNEN VAN ALLES ZIJN:
- Een screenshot van een receptenwebsite
- Een screenshot van een social media post (Instagram, TikTok, Facebook, Pinterest)
- Een pagina uit een kookboek (mogelijk zijwaarts/gedraaid gefotografeerd!)
- Een handgeschreven recept op papier (met pen/potlood, mogelijk slordig)
- Een receptkaart (voor- en/of achterkant)
- Een foto van alleen ingrediënten op een aanrecht
- Een foto van alleen de bereidingsstappen
- Een foto van het eindresultaat (het gerecht zelf)
- Een combinatie van bovenstaande
- Tekst die scheef, wazig, gedraaid, of deels zichtbaar is

SPECIFIEKE BRONTYPEN:

📱 SOCIAL MEDIA SCREENSHOTS (Instagram, TikTok, etc.):
- De recepttekst staat meestal in het bijschrift (caption) ONDER de foto
- Ingrediënten staan vaak als losse regels met hoeveelheden (bijv. "200 gr havermout")
- Bereiding staat vaak als doorlopende tekst onder "Bereiding" of soortgelijke kop
- Negeer UI-elementen (likes, comments, hashtags, profielnaam)
- De profielnaam/accountnaam kan als "bron" worden gebruikt
- Hashtags NIET overnemen als tags — maak zelf relevante tags
- Emojis in de tekst negeren, alleen de tekstinhoud extraheren

📝 HANDGESCHREVEN RECEPTEN:
- Lees ZEER zorgvuldig — handschrift kan slordig, schuin of vervaagd zijn
- Let op doorgestreepte woorden, verbeteringen, en aantekeningen in de marge
- Afkortingen zijn gebruikelijk: "el" = eetlepel, "tl" = theelepel, "gr" = gram, "ml" = milliliter
- Bij meerdere pagina's (bijv. "1/2" en "2/2"): combineer tot één recept
- Pijltjes (→, *, •) markeren vaak nieuwe stappen of ingrediënten
- Onderstreepte of HOOFDLETTER woorden zijn vaak koppen/titels

📖 KOOKBOEKPAGINA'S:
- Ingrediënten staan vaak in een apart kader of kolom ("Dit heb je nodig")
- Bereidingsstappen staan in een andere kolom ("Zo maak je het")
- Let op voedingswaarden die vaak bovenaan of onderaan staan (Kcal, Eiwit, Koolh., Vet, Vezels)
- Bereidingstijd staat vaak bij een klok-icoon
- Porties staan vaak bovenaan ("Voor X personen")
- Tips & tricks secties bevatten waardevolle informatie — neem op als weetje of extra stap
- Lees ook labels als "Koolhydraatarm", "Keto", "Glutenvrij" — gebruik als tags

JE AANPAK:
1. Bekijk ELKE foto zorgvuldig. DRAAI de tekst mentaal als die zijwaarts of ondersteboven staat!
2. Lees ALLE tekst op de pagina — ook kleine tekst, zijbalken, voetnoten
3. Als meerdere foto's samen een recept vormen, COMBINEER ze tot één geheel
4. Extraheer ingrediënten met EXACTE hoeveelheden — mis er GEEN
5. Extraheer ALLE bereidingsstappen in de juiste volgorde (let op nummering)
6. Als een foto het eindresultaat toont, gebruik dit voor de beschrijving maar NIET als stap
7. Als tekst moeilijk leesbaar is, doe je best om het te ontcijferen
8. Als informatie ontbreekt, laat die velden leeg — verzin NIKS
9. Let op: kookboekpagina's hebben vaak een ingrediëntenlijst EN genummerde stappen op DEZELFDE of TEGENOVERLIGGENDE pagina's

REGELS:
- ALLE tekst moet in het Nederlands zijn. Vertaal als nodig.
- Ingrediënten: scheid hoeveelheid, eenheid en naam ALTIJD apart. "200 gram kipfilet" → hoeveelheid: "200", eenheid: "gram", naam: "kipfilet"
- Standaardiseer eenheden: "gr." / "g" → "gram", "el" → "eetlepel", "tl" → "theelepel", "sn." → "snuf", "ml." → "ml"
- "handje", "handvol" → hoeveelheid: "1", eenheid: "handvol", naam: alleen het ingrediënt. Bijv. "handje basilicum" → hoeveelheid: "1", eenheid: "handvol", naam: "basilicum"
- "bosje", "bos" → hoeveelheid: "1", eenheid: "bos", naam: het ingrediënt
- "snuf", "snufje", "mespuntje" → hoeveelheid: "1", eenheid: "snuf", naam: het ingrediënt
- "scheutje", "scheut" → hoeveelheid: "1", eenheid: "scheut", naam: het ingrediënt
- "teen", "teentje" → eenheid: "teen". Bijv. "2 tenen knoflook" → hoeveelheid: "2", eenheid: "teen", naam: "knoflook"
- "klontje" → hoeveelheid: "1", eenheid: "klontje", naam: het ingrediënt
- "sap van X citroen/limoen" → hoeveelheid: het aantal, eenheid: null, naam: "citroen (sap)". Bijv. "sap van 1/2 citroen" → hoeveelheid: "0.5", eenheid: null, naam: "citroen (sap)"
- "rasp van X citroen/limoen" → hoeveelheid: het aantal, eenheid: null, naam: "citroen (rasp)"
- "naar smaak" → hoeveelheid: null, eenheid: null, naam: "peper en zout, naar smaak"
- Breuken altijd als decimaal: "1/2" → "0.5", "1/4" → "0.25", "3/4" → "0.75"
- Stappen: geef elke stap als aparte beschrijving, in logische volgorde
- Voedingswaarden: extraheer als zichtbaar (calorieën, eiwitten, vetten, etc.)
- Benodigdheden: pannen, ovenschalen, bakvormen etc. als vermeld
- Retourneer UITSLUITEND geldig JSON

JSON SCHEMA:
{
  "title": "string (verplicht)",
  "subtitle": "string | null",
  "tijd": "string | null (bijv. '25 min')",
  "moeilijkheid": "'Makkelijk' | 'Gemiddeld' | 'Moeilijk' | null",
  "bron": "string | null",
  "basis_porties": "number | null",
  "weetje": "string | null",
  "allergenen": "string | null",
  "ingredients": [{"hoeveelheid": "string | null", "eenheid": "string | null", "naam": "string"}],
  "steps": [{"titel": "string | null", "beschrijving": "string"}],
  "nutrition": {"energie_kcal": "string | null", "vetten": "string | null", "koolhydraten": "string | null", "eiwitten": "string | null", "vezels": "string | null", "zout": "string | null"} | null,
  "benodigdheden": ["string"] | null,
  "tags": ["string"] | null
}

BELANGRIJK voor de receptinhoud:
- Lees WERKELIJK ALLE tekst op elke foto. Mis NIKS. Lees ook:
  * Kleine tekst en zijbalken
  * Blokken met titels als "Instelling BBQ", "Instelling oven", "Tip:", "Opmerking:", "Tips & tricks"
  * Tijden, temperaturen, rusttijden
  * Porties/personen informatie
- Structureer de informatie zo:
  * subtitle: achtergrondverhaal, introductietekst, beschrijving van het gerecht
  * steps: ALLE bereidingsstappen inclusief:
    - Apparaat-instellingen (BBQ instelling, oventemperatuur) als EERSTE stap
    - Voorbereidingsstappen
    - De eigenlijke bereiding
    - Rusttijden, afwerking, serveren
  * weetje: alleen echte weetjes/fun facts/tips & tricks, NIET bereidingsinfo
- Geef de VOLLEDIGE titel, kort NIKS af
- Geef ALLE ingrediënten met exacte hoeveelheden apart gesplitst

Retourneer ALLEEN het JSON-object.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, bron } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Geen afbeeldingen ontvangen" },
        { status: 400 }
      );
    }

    if (images.length > 10) {
      return NextResponse.json(
        { error: "Maximaal 10 foto's per keer" },
        { status: 400 }
      );
    }

    // Build content blocks: all images + instruction
    const contentBlocks: any[] = [];

    for (let i = 0; i < images.length; i++) {
      const { data, media_type } = images[i];

      if (!data || !media_type) {
        return NextResponse.json(
          { error: `Afbeelding ${i + 1} is ongeldig` },
          { status: 400 }
        );
      }

      if (!ALLOWED_MEDIA_TYPES.includes(media_type as AllowedMediaType)) {
        return NextResponse.json(
          { error: `Afbeelding ${i + 1}: ongeldig formaat. Toegestaan: JPEG, PNG, GIF, WebP` },
          { status: 400 }
        );
      }

      const estimatedSize = Math.ceil((data.length * 3) / 4);
      if (estimatedSize > MAX_SIZE_PER_IMAGE) {
        return NextResponse.json(
          { error: `Afbeelding ${i + 1} is te groot (max 20MB)` },
          { status: 400 }
        );
      }

      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: media_type as AllowedMediaType,
          data,
        },
      });
    }

    const bronInstruction = bron
      ? ` De bron van dit recept is "${bron}" — gebruik dit als "bron" waarde in de JSON.`
      : '';

    contentBlocks.push({
      type: "text",
      text: images.length === 1
        ? `Bekijk deze foto nauwkeurig. Extraheer ALLES wat je kunt: receptnaam, ingrediënten met exacte hoeveelheden en eenheden (apart!), bereidingsstappen, tijden, porties, voedingswaarden.${bronInstruction}`
        : `Je krijgt ${images.length} foto's die samen één recept vormen. Bekijk elke foto nauwkeurig. Sommige foto's tonen misschien alleen ingrediënten, andere alleen stappen, weer andere het eindresultaat. Combineer ALLES tot één compleet recept. Mis niks — lees elke tekst op elke foto.${bronInstruction}`,
    });

    console.log(`[Image Extract] Processing ${images.length} image(s)`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          send({ type: "status", message: `${images.length} foto('s) analyseren met AI...` });

          const client = new Anthropic();

          send({ type: "status", message: "Tekst en ingrediënten herkennen..." });

          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: IMAGE_EXTRACTION_PROMPT,
            messages: [{ role: "user", content: contentBlocks }],
          });

          send({ type: "status", message: "AI-antwoord verwerken..." });

          const textBlocks = response.content.filter((b) => b.type === "text");
          if (textBlocks.length === 0) {
            send({ type: "error", error: "Geen antwoord van AI ontvangen" });
            controller.close();
            return;
          }

          const responseText = textBlocks
            .map((b) => (b.type === "text" ? b.text : ""))
            .join("\n");

          console.log(`[Image Extract] AI response length: ${responseText.length}`);

          const recipe = parseRecipeResponse(responseText);

          send({ type: "status", message: `"${recipe.title}" gevonden — ${recipe.ingredients?.length || 0} ingrediënten, ${recipe.steps?.length || 0} stappen` });
          send({ type: "done", recipe });
        } catch (error: any) {
          console.error("[Image Extract] Error:", error.message);
          send({ type: "error", error: error.message });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[Image Extract] Error:", message);
    return Response.json(
      { error: `Foto extractie mislukt: ${message}` },
      { status: 422 }
    );
  }
}
