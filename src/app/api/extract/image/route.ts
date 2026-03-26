import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  parseRecipeResponse,
} from "@/lib/extraction/prompt";

const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, media_type } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'image' field (expected base64 string)" },
        { status: 400 }
      );
    }

    if (!media_type || typeof media_type !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'media_type' field" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MEDIA_TYPES.includes(media_type as AllowedMediaType)) {
      return NextResponse.json(
        {
          error: `Invalid media_type. Allowed types: ${ALLOWED_MEDIA_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Estimate base64 decoded size (base64 is ~4/3 of original)
    const estimatedSize = Math.ceil((image.length * 3) / 4);
    if (estimatedSize > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds maximum size of 5MB" },
        { status: 400 }
      );
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: media_type as AllowedMediaType,
                data: image,
              },
            },
            {
              type: "text",
              text: "Extract the recipe from this image",
            },
          ],
        },
      ],
    });

    const textBlocks = response.content.filter(
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

    return NextResponse.json(recipe);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to extract recipe: ${message}` },
      { status: 422 }
    );
  }
}
