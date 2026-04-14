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

  return {
    title: `${title} — Receptenboek`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      ...(recipe.image_url && {
        images: [
          {
            url: recipe.image_url,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      }),
    },
    twitter: {
      card: recipe.image_url ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(recipe.image_url && { images: [recipe.image_url] }),
    },
  };
}

export default function RecipeDetailPage() {
  return <RecipeDetailClient />;
}
