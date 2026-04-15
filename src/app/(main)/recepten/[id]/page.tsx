import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import RecipeDetailClient from './RecipeDetailClient';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const { data: recipe } = await supabase
    .from('recipes')
    .select('title, subtitle, image_url')
    .eq('id', params.id)
    .single();

  if (!recipe) {
    return { title: 'Recept niet gevonden — Receptenboek' };
  }

  const title = recipe.title;
  const description = recipe.subtitle || `Bekijk "${recipe.title}" op Receptenboek`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://receptenboek-rcr7.vercel.app';

  // Proxy image through our own server to avoid hotlink protection from external sites
  const ogImageUrl = recipe.image_url
    ? `${siteUrl}/api/og?url=${encodeURIComponent(recipe.image_url)}`
    : null;

  return {
    title: `${title} — Receptenboek`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${siteUrl}/recepten/${params.id}`,
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

export default function RecipeDetailPage() {
  return <RecipeDetailClient />;
}
