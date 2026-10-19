'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye, Users } from 'lucide-react';
import { recipeCountLabel } from '@/components/collections/utils';
import type { CollectionWithDetails } from '@/types';

interface CollectionCardProps {
  collection: CollectionWithDetails;
}

/** Collectiekaart (design v2, scherm 09): collage 168px met 1 grote + 2 kleine foto's. */
export default function CollectionCard({ collection }: CollectionCardProps) {
  const images = collection.preview_images ?? [];
  const shared =
    (collection.collaborators?.length ?? 0) > 0 || (collection.follower_count ?? 0) > 0;

  const tile = (src: string | undefined, sizes: string) =>
    src ? (
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
    ) : null;

  return (
    <Link href={`/collecties/${collection.id}`} className="group flex flex-col gap-[9px]">
      <div className="relative">
        <div className="grid h-[168px] grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] grid-rows-2 gap-[3px] overflow-hidden rounded-card bg-background md:h-[200px]">
          <div className="relative row-span-2 min-h-0 min-w-0 bg-placeholder">
            {tile(images[0], '(max-width: 768px) 30vw, 20vw')}
          </div>
          <div className="relative min-h-0 min-w-0 bg-placeholder-2">{tile(images[1], '20vw')}</div>
          <div className="relative min-h-0 min-w-0 bg-placeholder-3">{tile(images[2], '20vw')}</div>
        </div>
        {(collection.is_following || collection.is_collaborator) && (
          <div className="absolute left-2 top-2 flex gap-1">
            {collection.is_following && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-[rgba(255,253,248,0.92)] px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Eye className="h-3 w-3" strokeWidth={2.2} />
                Volgend
              </span>
            )}
            {collection.is_collaborator && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-[rgba(255,253,248,0.92)] px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Users className="h-3 w-3" strokeWidth={2.2} />
                Sous-chef
              </span>
            )}
          </div>
        )}
      </div>
      <div className="px-0.5">
        <h3 className="line-clamp-1 text-[15.5px] font-semibold text-ink">{collection.title}</h3>
        <div className="mt-[3px] flex items-center gap-1.5 text-meta text-ink-3">
          {recipeCountLabel(collection.recipe_count)}
          {shared && (
            <>
              <span aria-hidden>·</span>
              <Users className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
              gedeeld
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
