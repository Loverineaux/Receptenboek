import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { steps, ingredients, basisPorties, newPorties } = body;

  if (!steps?.length || !basisPorties || !newPorties || basisPorties === newPorties) {
    return NextResponse.json({ steps });
  }

  const client = new Anthropic();

  const ingredientList = (ingredients || [])
    .map((i: any) => `${i.hoeveelheid || ''} ${i.eenheid || ''} ${i.naam}`.trim())
    .join(', ');

  const stepsText = steps
    .map((s: any, i: number) => `${i + 1}. ${s.beschrijving}`)
    .join('\n');

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: `Je past bereidingsstappen aan van ${basisPorties} naar ${newPorties} porties.

REGELS:
- Pas ALLE hoeveelheden aan: "roer het ei" → "roer de ${newPorties > 1 ? Math.round(newPorties / basisPorties) + ' eieren' : 'eieren'}"
- Pas enkelvoud/meervoud aan: "de ui" → "de ${newPorties > basisPorties ? 'uien' : 'ui'}"
- Pas aantallen aan: "snij 1 tomaat" → "snij ${Math.round(newPorties / basisPorties)} tomaten"
- Pas ook impliciete hoeveelheden aan: "doe de helft" blijft relatief
- Pas GEEN tijden aan (baktijd blijft gelijk)
- Pas GEEN temperaturen aan
- Behoud de stijl en toon van de originele tekst
- Retourneer ALLEEN een JSON array van strings (de aangepaste stappen), geen andere tekst`,
    messages: [{
      role: "user",
      content: `Ingrediënten (voor ${basisPorties} porties): ${ingredientList}

Bereidingsstappen (voor ${basisPorties} porties):
${stepsText}

Pas deze aan voor ${newPorties} porties. Retourneer een JSON array van strings.`,
    }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  try {
    let jsonStr = text.trim();
    const m = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (m) jsonStr = m[1].trim();
    if (!jsonStr.startsWith("[")) {
      const am = jsonStr.match(/\[[\s\S]*\]/);
      if (am) jsonStr = am[0];
    }

    const scaledSteps: string[] = JSON.parse(jsonStr);

    // Map back to step objects
    const result = steps.map((s: any, i: number) => ({
      ...s,
      beschrijving: scaledSteps[i] || s.beschrijving,
    }));

    return NextResponse.json({ steps: result });
  } catch {
    // If AI response can't be parsed, return original
    return NextResponse.json({ steps });
  }
}
