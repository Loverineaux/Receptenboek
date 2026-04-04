'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { GenericIngredient } from '@/types';

interface IngredientCardProps {
  ingredient: GenericIngredient & { recipe_count?: number };
}

const CATEGORY_EMOJI: Record<string, string> = {
  groente: '🥬',
  fruit: '🍎',
  vlees: '🥩',
  vis: '🐟',
  zuivel: '🧀',
  granen: '🌾',
  kruiden: '🌿',
  overig: '🫙',
};

export default function IngredientCard({ ingredient }: IngredientCardProps) {
  const router = useRouter();

  const fallbackEmoji =
    CATEGORY_EMOJI[(ingredient.category ?? '').toLowerCase()] ?? '🫙';

  const handleClick = () => {
    router.push(`/ingredienten/${ingredient.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {ingredient.image_url ? (
          <Image
            src={ingredient.image_url}
            alt={ingredient.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/60">
            <span className="text-4xl">{fallbackEmoji}</span>
          </div>
        )}

        {/* Category badge — bottom left */}
        {ingredient.category && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {ingredient.category}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-text-primary">
          {ingredient.name}
        </h3>

        <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
          {ingredient.product_count > 0 && (
            <span>
              {ingredient.product_count}{' '}
              {ingredient.product_count === 1 ? 'product' : 'producten'}
            </span>
          )}
          {ingredient.recipe_count != null && ingredient.recipe_count > 0 && (
            <>
              {ingredient.product_count > 0 && <span>·</span>}
              <span>
                {ingredient.recipe_count}{' '}
                {ingredient.recipe_count === 1 ? 'recept' : 'recepten'}
              </span>
            </>
          )}
        </div>

        {ingredient.avg_kcal != null && (
          <p className="mt-0.5 text-xs text-text-muted">
            {Math.round(ingredient.avg_kcal)} kcal/100g
          </p>
        )}
      </div>
    </div>
  );
}
