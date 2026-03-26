import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  parseRecipeResponse,
} from "@/lib/extraction/prompt";
import { getCachedRecipe, setCachedRecipe } from "@/lib/extraction/cache";

export async function POST(request: NextRequest) {
  try {
    // Placeholder rate limiting header check
    const _userId = request.headers.get("X-User-Id");

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Check cache
    const cached = getCachedRecipe(url);
    if (cached) {
      return NextResponse.json(cached);
    }

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Extract the recipe from this URL: ${url}`,
        },
      ],
    });

    // Extract text from response content blocks
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

    // Cache the result
    setCachedRecipe(url, recipe);

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
