'use client';

import { useRouter } from 'next/navigation';
import { Clock, Heart } from 'lucide-react';
import BronBadge from '@/components/ui/BronBadge';
import StarRating from '@/components/ui/StarRating';
import type { RecipeWithRelations } from '@/types';

interface RecipeCardProps {
  recipe: RecipeWithRelations;
  onFavoriteToggle?: (recipeId: string, isFavorited: boolean) => void;
}

export default function RecipeCard({ recipe, onFavoriteToggle }: RecipeCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/recepten/${recipe.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(recipe.id, !recipe.is_favorited);
  };

  const totalTime = recipe.total_time_minutes ?? (
    ((recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)) || null
  );

  return (
    <div
      onClick={handleClick}
      className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg sm:w-72"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/60">
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        {/* BronBadge overlay */}
        <div className="absolute left-2 top-2">
          <BronBadge bron={recipe.source} />
        </div>

        {/* Favorite heart */}
        <button
          onClick={handleFavoriteClick}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              recipe.is_favorited
                ? 'fill-red-500 text-red-500'
                : 'text-gray-600'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-text-primary">
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
            {recipe.description}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {totalTime && (
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="h-3.5 w-3.5" />
                <span>{totalTime} min</span>
              </div>
            )}
          </div>

          {recipe.average_rating !== null && recipe.average_rating !== undefined && (
            <StarRating
              value={recipe.average_rating}
              readOnly
              count={recipe.ratings?.length ?? 0}
            />
          )}
        </div>
      </div>
    </div>
  );
}
