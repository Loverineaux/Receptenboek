import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { barcode, image, product_name } = body;

    if (!barcode || typeof barcode !== 'string') {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // 1. Extract base64 data and media type from the data URL
    const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid image data URL format' },
        { status: 400 }
      );
    }

    const mediaType = match[1] as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp';
    const base64Data = match[2];

    // 2. Call Claude vision to read the nutrition label
    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'Lees de voedingswaardentabel op deze foto.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Lees de voedingswaardentabel op deze foto en geef de waarden per 100g als JSON.
Geef ALLEEN geldig JSON terug, zonder extra tekst:
{
  "product_name": "string of null (productnaam als zichtbaar)",
  "kcal": number of null,
  "protein": number of null,
  "fat": number of null,
  "saturated_fat": number of null,
  "carbs": number of null,
  "sugars": number of null,
  "fiber": number of null,
  "salt": number of null,
  "weight_grams": number of null
}
Alle waarden per 100g. Gebruik null als iets niet leesbaar is.`,
            },
          ],
        },
      ],
    });

    // 3. Parse the JSON response
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'Geen antwoord van AI ontvangen' },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      // Extract JSON from the response (handle potential markdown fences)
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: 'AI-antwoord kon niet worden verwerkt' },
        { status: 500 }
      );
    }

    // 4. Create product in the products table
    const productData = {
      barcode: barcode.trim(),
      product_name:
        product_name || parsed.product_name || 'Onbekend product',
      kcal: typeof parsed.kcal === 'number' ? parsed.kcal : null,
      protein: typeof parsed.protein === 'number' ? parsed.protein : null,
      fat: typeof parsed.fat === 'number' ? parsed.fat : null,
      saturated_fat:
        typeof parsed.saturated_fat === 'number'
          ? parsed.saturated_fat
          : null,
      carbs: typeof parsed.carbs === 'number' ? parsed.carbs : null,
      sugars: typeof parsed.sugars === 'number' ? parsed.sugars : null,
      fiber: typeof parsed.fiber === 'number' ? parsed.fiber : null,
      salt: typeof parsed.salt === 'number' ? parsed.salt : null,
      weight_grams:
        typeof parsed.weight_grams === 'number'
          ? parsed.weight_grams
          : null,
      source: 'user_photo' as const,
    };

    const { data: savedProduct, error: insertError } = await supabaseAdmin
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // 5. Return the product
    return NextResponse.json({ product: savedProduct });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[Scan Label] Error:', message);
    return NextResponse.json(
      { error: `Label scan mislukt: ${message}` },
      { status: 500 }
    );
  }
}
