import type { Metadata } from 'next';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { RECIPE_DETAIL_SELECT, mapRecipeRow } from '@/lib/recipes/recipe-detail-query';
import RecipeDetailClient from './RecipeDetailClient';

interface Props {
  // Next.js 15: route params are async and must be awaited.
  params: Promise<{ id: string }>;
}

// Load the full recipe once per request. cache() dedupes the call between
// generateMetadata and the page component, so the nested query runs a single
// time server-side (in Dublin, next to the DB) instead of the old setup where
// the page fetched nothing and the client had to fetch the whole thing after
// hydrating — the waterfall that made opening a recipe take seconds.
const getRecipe = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('recipes')
    .select(RECIPE_DETAIL_SELECT)
    .eq('id', id)
    .single();
  return data ? mapRecipeRow(data) : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    return { title: 'Recept niet gevonden — Receptenboek' };
  }

  const title = recipe.title;
  const description = recipe.subtitle || `Bekijk "${recipe.title}" op Receptenboek`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://receptenboek-rcr7.vercel.app';

  // Use Next.js image optimizer for OG images — resizes and compresses automatically
  // This also proxies external images, bypassing hotlink protection
  const ogImageUrl = recipe.image_url
    ? `${siteUrl}/_next/image?url=${encodeURIComponent(recipe.image_url)}&w=1200&q=75`
    : null;

  return {
    title: `${title} — Receptenboek`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/recepten/${id}`,
      siteName: 'Receptenboek',
      ...(ogImageUrl && {
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      }),
    },
    twitter: {
      card: ogImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImageUrl && { images: [ogImageUrl] }),
    },
  };
}

export default async function RecipeDetailPage({ params }: Props) {
  // Hand the recipe to the client component as initial data, so it renders
  // immediately instead of showing a spinner while it fetches client-side.
  const { id } = await params;
  const recipe = await getRecipe(id);
  return <RecipeDetailClient initialRecipe={recipe} />;
}
