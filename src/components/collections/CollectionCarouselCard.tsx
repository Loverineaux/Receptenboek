'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { recipeCountLabel } from './utils';
import type { CollectionWithDetails } from '@/types';

/** 150x150 collectiekaart voor de carrousel op Favorieten (cover = collectiefoto of eerste receptfoto). */
export function CollectionCarouselCard({ collection }: { collection: CollectionWithDetails }) {
  const cover = collection.image_url || collection.preview_images?.[0] || null;
  return (
    <Link
      href={`/collecties/${collection.id}`}
      className="group flex w-[150px] shrink-0 flex-col md:w-[170px]"
    >
      <div className="relative h-[150px] overflow-hidden rounded-card bg-placeholder md:h-[170px]">
        {cover && (
          <Image
            src={cover}
            alt=""
            fill
            sizes="170px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="mt-[9px] line-clamp-1 text-[15px] font-semibold text-ink">{collection.title}</div>
      <div className="mt-0.5 text-meta text-ink-3">{recipeCountLabel(collection.recipe_count)}</div>
    </Link>
  );
}

/** Gestippelde "Nieuw"-kaart naast de carrousel. */
export function NewCollectionCarouselCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[150px] w-[110px] shrink-0 flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line-strong text-[13.5px] font-semibold text-primary transition-colors hover:bg-surface md:h-[170px]"
    >
      <Plus className="h-[22px] w-[22px]" strokeWidth={2.2} />
      Nieuw
    </button>
  );
}
