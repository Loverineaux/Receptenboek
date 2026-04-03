import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const body = await request.json();
  const { ingredienten } = body;

  if (!ingredienten || !Array.isArray(ingredienten) || ingredienten.length === 0) {
    return NextResponse.json(
      { error: 'Geen ingrediënten meegegeven' },
      { status: 400 }
    );
  }

  // Normalize user ingredients
  const userIngredients = ingredienten.map((i: string) => i.toLowerCase().trim()).filter(Boolean);

  // Build word-boundary regex for each user ingredient
  // "kip" should match "kippendij" and "kipfilet" but "ui" should NOT match "kruidentuin"
  const userPatterns = userIngredients.map((ui) => ({
    raw: ui,
    regex: new RegExp(`(^|\\s|-)${ui.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
  }));

  // Fetch all recipes with their ingredients
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select(`
      id, title, subtitle, image_url, bron, tijd, moeilijkheid, categorie, created_at,
      ingredients(naam),
      tags:recipe_tags(tag:tags(id, name)),
      ratings(sterren, user_id),
      comments(id)
    `);

  if (error) {
    console.log('[Suggesties] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Suggesties] Fetched ${(recipes ?? []).length} recipes, searching for: ${userIngredients.join(', ')}`);

  // Match recipes
  const results = (recipes ?? [])
    .map((recipe: any) => {
      const recipeIngredients = (recipe.ingredients ?? [])
        .map((i: any) => (i.naam || '').toLowerCase().trim())
        .filter(Boolean);

      if (recipeIngredients.length === 0) return null;

      // Count matches: each user ingredient counts max 1x
      // Uses word-boundary matching so "ui" matches "uien" but NOT "kruidentuin"
      const usedUserIngredients = new Set<string>();
      const missing: string[] = [];

      for (const ri of recipeIngredients) {
        const matchedPattern = userPatterns.find(
          (p) => p.regex.test(ri) || ri.startsWith(p.raw)
        );
        if (matchedPattern && !usedUserIngredients.has(matchedPattern.raw)) {
          usedUserIngredients.add(matchedPattern.raw);
        }
        if (!matchedPattern) {
          missing.push(ri);
        }
      }

      const matchCount = usedUserIngredients.size;
      const totalCount = recipeIngredients.length;
      const matchPercentage = matchCount / totalCount;

      // Must match at least 1 ingredient
      if (matchCount === 0) return null;

      // Dynamic threshold: with few user ingredients, focus on how many
      // of the user's ingredients are used (not what % of the recipe)
      // With many user ingredients, also consider recipe coverage
      const userCoverage = matchCount / userIngredients.length; // how many of user's items are used
      if (userIngredients.length >= 5 && matchPercentage < 0.3) return null;

      // Compute average rating
      const ratings = recipe.ratings ?? [];
      const avg = ratings.length > 0
        ? ratings.reduce((s: number, r: any) => s + r.sterren, 0) / ratings.length
        : null;

      const flatTags = (recipe.tags ?? []).map((rt: any) => rt.tag).filter(Boolean);

      // Build matched list (recipe ingredients that the user has)
      const matchedIngredients: string[] = [];
      for (const ri of recipeIngredients) {
        const matchedPattern = userPatterns.find(
          (p) => p.regex.test(ri) || ri.startsWith(p.raw)
        );
        if (matchedPattern) matchedIngredients.push(ri);
      }

      return {
        recipe: {
          ...recipe,
          tags: flatTags,
          average_rating: avg,
          nutrition: null,
          steps: [],
        },
        matchCount,
        totalCount,
        matchPercentage,
        matched: matchedIngredients,
        missing,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      // Sort by match count DESC, then percentage DESC, then rating DESC
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
      return (b.recipe.average_rating ?? 0) - (a.recipe.average_rating ?? 0);
    })
    .slice(0, 20);

  return NextResponse.json(results);
}
