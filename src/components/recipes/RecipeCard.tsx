'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FolderCheck, FolderPlus, Heart, MessageCircle, MoreHorizontal, Share2, UtensilsCrossed } from 'lucide-react';
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
  /** 'grid' = foto-kaart (164px), 'list' = rij met 84px thumbnail */
  layout?: 'grid' | 'list';
}

export function formatRating(avg: number): string {
  return avg.toFixed(1).replace('.', ',');
}

export default function RecipeCard({
  recipe,
  onFavoriteToggle,
  onRate,
  userRating,
  onAddToCollection,
  isInCollection,
  initialUserRating = 0,
  onShare,
  layout = 'grid',
}: RecipeCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [menuOpen]);

  // Live average: recalculate from API average + user's rating change
  const liveAvg = (() => {
    const apiAvg = recipe.average_rating ?? 0;
    const apiCount = recipe.rating_count ?? recipe.ratings?.length ?? 0;
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

  const commentCount = recipe.comment_count ?? recipe.comments?.length ?? 0;
  const hasMenu = !!(onShare || onAddToCollection || onRate);

  const handleClick = () => {
    router.push(`/recepten/${recipe.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(recipe.id, !recipe.is_favorited);
  };

  const favButton = (size: 'sm' | 'lg') => (
    <button
      type="button"
      data-tour="favorite-button"
      onClick={handleFavoriteClick}
      aria-label={recipe.is_favorited ? 'Verwijderen uit favorieten' : 'Toevoegen aan favorieten'}
      aria-pressed={!!recipe.is_favorited}
      className={
        size === 'sm'
          ? 'flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(255,253,248,0.92)] shadow-sm transition-colors hover:bg-surface'
          : 'flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-sunk'
      }
    >
      <Heart
        className={`${size === 'sm' ? 'h-4 w-4' : 'h-[19px] w-[19px]'} transition-colors ${
          recipe.is_favorited ? 'fill-primary text-primary' : 'text-ink'
        }`}
        strokeWidth={2}
      />
    </button>
  );

  const moreButton = (size: 'sm' | 'lg') =>
    hasMenu ? (
      <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Meer acties"
          aria-expanded={menuOpen}
          className={
            size === 'sm'
              ? 'flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(255,253,248,0.92)] text-ink shadow-sm transition-colors hover:bg-surface'
              : 'flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-sunk'
          }
        >
          <MoreHorizontal className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2} />
        </button>
        {menuOpen && (
          <div
            className={`absolute right-0 z-30 w-56 animate-fade-in rounded-card border border-line bg-surface p-1.5 shadow-lg ${
              size === 'sm' ? 'bottom-full mb-2' : 'top-full mt-1'
            }`}
          >
            {onShare && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onShare(recipe.id); }}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-input px-3 text-left text-[15px] text-ink hover:bg-sunk"
              >
                <Share2 className="h-[18px] w-[18px] text-ink-3" strokeWidth={2} />
                Delen
              </button>
            )}
            {onAddToCollection && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onAddToCollection(recipe.id); }}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-input px-3 text-left text-[15px] text-ink hover:bg-sunk"
              >
                {isInCollection ? (
                  <FolderCheck className="h-[18px] w-[18px] text-primary" strokeWidth={2} />
                ) : (
                  <FolderPlus className="h-[18px] w-[18px] text-ink-3" strokeWidth={2} />
                )}
                {isInCollection ? 'In collectie' : 'Toevoegen aan collectie'}
              </button>
            )}
            {onRate && (
              <div className="border-t border-line-soft px-3 py-2">
                <p className="mb-0.5 text-meta text-ink-3">Jouw beoordeling</p>
                <div className="flex items-center gap-2">
                  <StarRating
                    value={userRating ?? 0}
                    onChange={(rating) => onRate(recipe.id, rating === userRating ? 0 : rating)}
                  />
                  {userRating && userRating > 0 ? (
                    <button
                      type="button"
                      onClick={() => onRate(recipe.id, 0)}
                      className="rounded-chip bg-primary-tint px-2 py-0.5 text-[11px] font-semibold text-primary"
                      title="Stem verwijderen"
                    >
                      Wissen
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    ) : null;

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-meta text-ink-3">
      {recipe.tijd && <span>{recipe.tijd}</span>}
      {liveAvg.count > 0 && liveAvg.avg > 0 && (
        <span data-tour="star-rating" className="tabular font-semibold text-primary">
          ★ {formatRating(liveAvg.avg)}
          <span
            className="ml-1 font-normal text-ink-3"
            aria-label={`${liveAvg.count} ${liveAvg.count === 1 ? 'beoordeling' : 'beoordelingen'}`}
          >
            ({liveAvg.count})
          </span>
        </span>
      )}
      {commentCount > 0 && (
        <span data-tour="comment-count" className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
          {commentCount}
        </span>
      )}
    </div>
  );

  const photo = (sizes: string) =>
    recipe.image_url ? (
      <Image
        src={recipe.image_url}
        alt={recipe.title}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-placeholder text-ink-4">
        <UtensilsCrossed className="h-7 w-7" strokeWidth={1.8} />
      </div>
    );

  if (layout === 'list') {
    return (
      <div
        data-tour="recipe-card"
        data-recipe-id={recipe.id}
        onClick={handleClick}
        className="group flex w-full cursor-pointer items-center gap-3.5 rounded-card border border-line-soft bg-surface p-2"
      >
        <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[14px] bg-placeholder">
          {photo('84px')}
        </div>
        <div className="min-w-0 flex-1">
          {recipe.bron && (
            <p className="mb-0.5 truncate text-[12px] font-semibold text-primary">{recipe.bron}</p>
          )}
          <h3 className="line-clamp-2 text-[15.5px] font-semibold leading-[1.3] text-ink text-pretty">{recipe.title}</h3>
          <div className="mt-1.5">{meta}</div>
        </div>
        <div data-tour="card-actions" className="flex shrink-0 items-center">
          {moreButton('lg')}
          {favButton('lg')}
        </div>
      </div>
    );
  }

  return (
    <div
      data-tour="recipe-card"
      data-recipe-id={recipe.id}
      onClick={handleClick}
      className="group flex w-full cursor-pointer flex-col gap-[9px]"
    >
      <div className="relative">
        <div className="relative h-[164px] overflow-hidden rounded-card bg-placeholder md:h-[190px]">
          {photo('(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw')}
        </div>
        {recipe.bron && (
          <div className="pointer-events-none absolute left-2.5 right-[52px] top-2.5 flex">
            <span className="flex h-[26px] min-w-0 items-center rounded-chip bg-[rgba(255,253,248,0.92)] px-2.5 text-[12px] font-semibold text-primary shadow-sm">
              <span className="truncate">{recipe.bron}</span>
            </span>
          </div>
        )}
        <div data-tour="card-actions" className="absolute right-2.5 top-2.5">
          {favButton('sm')}
        </div>
        {hasMenu && <div className="absolute bottom-2.5 right-2.5">{moreButton('sm')}</div>}
      </div>
      <div className="px-0.5">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.3] text-ink text-pretty">{recipe.title}</h3>
        <div className="mt-[5px] flex items-center justify-between gap-2">
          {meta}
        </div>
      </div>
    </div>
  );
}
