'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, FolderCheck, FolderPlus, Heart, MessageCircle, Share2 } from 'lucide-react';
import BronBadge from '@/components/ui/BronBadge';
import StarRating from '@/components/ui/StarRating';
import type { RecipeWithRelations } from '@/types';

interface RecipeCardProps {
  recipe: RecipeWithRelations;
  onFavoriteToggle?: (recipeId: string, isFavorited: boolean) => void;
  onRate?: (recipeId: string, rating: number) => void;
  userRating?: number;
  onAddToCollection?: (recipeId: string) => void;
  isInCollection?: boolean;
  initialUserRating?: number;
  onShare?: (recipeId: string) => void;
}

// Category tags that should be displayed as filter badges
const CATEGORY_TAGS = new Set([
  'kip', 'vlees', 'vis', 'vegetarisch', 'veganistisch',
  'pasta', 'salade', 'soep', 'dessert', 'ontbijt', 'lunch',
]);

export default function RecipeCard({ recipe, onFavoriteToggle, onRate, userRating, onAddToCollection, isInCollection, initialUserRating = 0, onShare }: RecipeCardProps) {
  const router = useRouter();

  // Live average: recalculate from API average + user's rating change
  const liveAvg = (() => {
    const apiAvg = recipe.average_rating ?? 0;
    const apiCount = recipe.ratings?.length ?? 0;
    if (!onRate) return { avg: apiAvg, count: apiCount };

    const cur = userRating ?? 0;
    const init = initialUserRating;
    let avg = apiAvg;
    let count = apiCount;

    if (cur > 0 && init > 0) {
      avg = apiCount > 0 ? (apiAvg * apiCount - init + cur) / apiCount : cur;
    } else if (cur > 0 && init === 0) {
      count = apiCount + 1;
      avg = (apiAvg * apiCount + cur) / count;
    } else if (cur === 0 && init > 0) {
      count = apiCount - 1;
      avg = count > 0 ? (apiAvg * apiCount - init) / count : 0;
    }

    return { avg, count };
  })();

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

        {/* Action buttons — top right */}
        <div className="absolute right-2 top-2 flex items-center gap-2">
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(recipe.id); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
              title="Delen"
            >
              <Share2 className="h-4 w-4 text-gray-600" />
            </button>
          )}
          {onAddToCollection && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCollection(recipe.id); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
              title={isInCollection ? 'In collectie' : 'Toevoegen aan collectie'}
            >
              {isInCollection ? (
                <FolderCheck className="h-4 w-4 fill-primary text-primary" />
              ) : (
                <FolderPlus className="h-4 w-4 text-gray-600" />
              )}
            </button>
          )}
          <button
            onClick={handleFavoriteClick}
            className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-1.5 backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                recipe.is_favorited
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-600'
              }`}
            />
            {(recipe as any).favorite_count > 0 && (
              <span className="text-[11px] font-medium text-gray-600">
                {(recipe as any).favorite_count}
              </span>
            )}
          </button>
        </div>

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

        {recipe.tijd && (
          <div className="mt-2 flex items-center gap-1 text-xs text-text-muted">
            <Clock className="h-3 w-3" />
            <span>{recipe.tijd}</span>
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          {onRate ? (
            <div className="flex items-center gap-1.5">
              <StarRating
                value={liveAvg.avg}
                onChange={(rating) => onRate(recipe.id, rating === userRating ? 0 : rating)}
              />
              <span className="text-xs text-text-muted">({liveAvg.count})</span>
              {userRating && userRating > 0 && (
                <button
                  onClick={() => onRate(recipe.id, 0)}
                  className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                  title="Stem verwijderen"
                >
                  Jij: {userRating}★ ✕
                </button>
              )}
            </div>
          ) : (
            <StarRating
              value={recipe.average_rating ?? 0}
              readOnly
              count={recipe.ratings?.length ?? 0}
            />
          )}
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{recipe.comments?.length ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
