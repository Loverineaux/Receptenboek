import type { RecipeWithRelations } from '@/types';

/**
 * The nested select used to load a full recipe detail page in one query.
 * Shared between the server (page.tsx, for the initial render) and the client
 * (RecipeDetailClient, for background refresh) so both stay in sync.
 */
export const RECIPE_DETAIL_SELECT = `
  *,
  ingredients(*),
  steps(*),
  tags:recipe_tags(tag:tags(*)),
  nutrition(*),
  ratings(*),
  benodigdheden(*),
  comments(*, user:profiles!comments_user_id_fkey(id, display_name, avatar_url)),
  user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
`;

/**
 * Normalise a raw recipe row from RECIPE_DETAIL_SELECT into the shape the UI
 * expects: flat tags, computed average rating, single nutrition object, and
 * ingredients/steps sorted by sort_order. `favorite_count` / `is_favorited`
 * are intentionally left out — they come from a separate, user-specific
 * endpoint and are filled in client-side.
 */
export function mapRecipeRow(data: any): RecipeWithRelations {
  const ratings = data.ratings ?? [];
  const average_rating =
    ratings.length > 0
      ? ratings.reduce((s: number, r: any) => s + r.sterren, 0) / ratings.length
      : null;

  const tags = (data.tags ?? []).map((rt: any) => rt.tag).filter(Boolean);

  return {
    ...(data as any),
    tags,
    average_rating,
    nutrition: Array.isArray(data.nutrition)
      ? data.nutrition[0] ?? null
      : data.nutrition,
    ingredients: (data.ingredients ?? []).sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
    steps: (data.steps ?? []).sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
    comments: data.comments ?? [],
    user: data.user as any,
  };
}
