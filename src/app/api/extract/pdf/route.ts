import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  parseRecipeResponse,
} from "@/lib/extraction/prompt";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdf } = body;

    if (!pdf || typeof pdf !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'pdf' field (expected base64 string)" },
        { status: 400 }
      );
    }

    // Estimate base64 decoded size (base64 is ~4/3 of original)
    const estimatedSize = Math.ceil((pdf.length * 3) / 4);
    if (estimatedSize > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "PDF exceeds maximum size of 10MB" },
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
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdf,
              },
            },
            {
              type: "text",
              text: "Extract the recipe from this PDF document",
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
