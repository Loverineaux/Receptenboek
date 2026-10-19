'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Star } from 'lucide-react';
import { formatRating } from '@/components/recipes/RecipeCard';
import type { RecipeWithRelations } from '@/types';

interface HeroRecipeCardProps {
  recipe: RecipeWithRelations;
  /** Eerlijk label linksboven, bijv. "Hoog beoordeeld" of "Uitgelicht" */
  label: string;
}

/**
 * Hero-kaart "Voor vanavond" (design v2, scherm 01): 248px, radius 26, foto met
 * onderverloop, witte titel van 26px en een ronde pijl-knop naar het recept.
 */
export default function HeroRecipeCard({ recipe, label }: HeroRecipeCardProps) {
  const hasRating = (recipe.rating_count ?? 0) > 0 && (recipe.average_rating ?? 0) > 0;

  return (
    <Link
      href={`/recepten/${recipe.id}`}
      aria-label={`Open recept: ${recipe.title}`}
      className="group relative block h-[248px] overflow-hidden rounded-[26px] bg-placeholder-2 md:h-[320px]"
    >
      {recipe.image_url && (
        <Image
          src={recipe.image_url}
          alt=""
          fill
          priority
          sizes="(max-width: 1152px) 100vw, 1152px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="photo-fade pointer-events-none absolute inset-0" />

      <div className="pointer-events-none absolute left-3.5 top-3.5 flex h-[30px] items-center gap-1.5 rounded-chip bg-[rgba(255,253,248,0.92)] px-3 text-[12.5px] font-semibold text-primary">
        <Star className="h-3.5 w-3.5" strokeWidth={2.2} />
        {label}
      </div>

      <div className="absolute inset-x-5 bottom-[18px] flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-3 font-display text-hero-title font-semibold text-white text-pretty">
            {recipe.title}
          </h2>
          <div className="mt-2 flex gap-3.5 text-meta font-medium text-white">
            {recipe.tijd && <span>{recipe.tijd}</span>}
            {hasRating && <span className="tabular">★ {formatRating(recipe.average_rating as number)}</span>}
          </div>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-primary">
          <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
        </span>
      </div>
    </Link>
  );
}
