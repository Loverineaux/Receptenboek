'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, Heart, MessageCircle } from 'lucide-react';
import BronBadge from '@/components/ui/BronBadge';
import StarRating from '@/components/ui/StarRating';
import type { RecipeWithRelations } from '@/types';

interface RecipeCardProps {
  recipe: RecipeWithRelations;
  onFavoriteToggle?: (recipeId: string, isFavorited: boolean) => void;
}

// Category tags that should be displayed as filter badges
const CATEGORY_TAGS = new Set([
  'kip', 'vlees', 'vis', 'vegetarisch', 'veganistisch',
  'pasta', 'salade', 'soep', 'dessert', 'ontbijt', 'lunch',
]);

export default function RecipeCard({ recipe, onFavoriteToggle }: RecipeCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/recepten/${recipe.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(recipe.id, !recipe.is_favorited);
  };

  // Split tags into category tags and other tags
  const categoryTags = (recipe.tags || []).filter(
    (t: any) => CATEGORY_TAGS.has((t.name || '').toLowerCase())
  );

  return (
    <div
      onClick={handleClick}
      className="group relative w-full cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg sm:w-72"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-primary/60">
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        {/* BronBadge — top left */}
        <div className="absolute left-2 top-2">
          <BronBadge bron={recipe.bron} />
        </div>

        {/* Favorite heart — top right */}
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

        {/* Category tags — bottom left on image */}
        {categoryTags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {categoryTags.map((tag: any) => (
              <span
                key={tag.id || tag.name}
                className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-text-primary">
          {recipe.title}
        </h3>

        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
          {recipe.tijd && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{recipe.tijd}</span>
            </div>
          )}
          {(recipe.comments?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{recipe.comments.length}</span>
            </div>
          )}
        </div>
        <div className="mt-1.5">
          <StarRating
            value={recipe.average_rating ?? 0}
            readOnly
            count={recipe.ratings?.length ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
