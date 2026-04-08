'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Users, Eye } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import type { CollectionWithDetails } from '@/types';

interface CollectionCardProps {
  collection: CollectionWithDetails;
  onRate?: (collectionId: string, rating: number) => void;
  userRating?: number;
  initialUserRating?: number;
}

export default function CollectionCard({ collection, onRate, userRating, initialUserRating = 0 }: CollectionCardProps) {
  const router = useRouter();
  const images = collection.preview_images;

  return (
    <div
      onClick={() => router.push(`/collecties/${collection.id}`)}
      className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
    >
      {/* 2x2 preview grid */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {/* Badges */}
        {(collection.is_following || collection.is_collaborator) && (
          <div className="absolute left-2 top-2 z-10 flex gap-1">
            {collection.is_following && (
              <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                <Eye className="h-3 w-3" />
                Volgend
              </span>
            )}
            {collection.is_collaborator && (
              <span className="flex items-center gap-1 rounded-full bg-primary/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                <Users className="h-3 w-3" />
                Sous-chef
              </span>
            )}
          </div>
        )}
        {images.length > 0 ? (
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="relative overflow-hidden">
                {images[i] ? (
                  <Image
                    src={images[i]}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full bg-gray-100" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
            <span className="text-4xl">📚</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-text-primary">
          {collection.title}
        </h3>
        {collection.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
            {collection.description}
          </p>
        )}
        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
          {onRate ? (
            <CollectionRatingRow
              collection={collection}
              userRating={userRating}
              initialUserRating={initialUserRating}
              onRate={onRate}
            />
          ) : (
            <StarRating
              value={collection.average_rating ?? 0}
              readOnly
              count={collection.rating_count ?? 0}
            />
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {collection.recipe_count} recept{collection.recipe_count !== 1 ? 'en' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Owner + sous-chef avatars */}
            <div className="flex -space-x-1.5">
              {collection.user?.avatar_url ? (
                <img
                  src={collection.user.avatar_url}
                  alt={collection.user.display_name || ''}
                  title={collection.user.display_name || 'Eigenaar'}
                  className="h-5 w-5 rounded-full border border-white object-cover"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-100" title={collection.user?.display_name || 'Eigenaar'}>
                  <User className="h-3 w-3 text-text-muted" />
                </div>
              )}
              {(collection.collaborators ?? []).slice(0, 3).map((c) =>
                c.avatar_url ? (
                  <img
                    key={c.id}
                    src={c.avatar_url}
                    alt={c.display_name || ''}
                    title={c.display_name || 'Sous-chef'}
                    className="h-5 w-5 rounded-full border border-white object-cover"
                  />
                ) : (
                  <div key={c.id} className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-100" title={c.display_name || 'Sous-chef'}>
                    <User className="h-3 w-3 text-text-muted" />
                  </div>
                )
              )}
              {(collection.collaborators ?? []).length > 3 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-200 text-[9px] font-medium text-text-secondary">
                  +{(collection.collaborators ?? []).length - 3}
                </div>
              )}
            </div>
            <span className="text-xs text-text-muted">
              {collection.user?.display_name || 'Gebruiker'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionRatingRow({
  collection,
  userRating,
  initialUserRating,
  onRate,
}: {
  collection: CollectionWithDetails;
  userRating?: number;
  initialUserRating: number;
  onRate: (collectionId: string, rating: number) => void;
}) {
  const apiAvg = collection.average_rating ?? 0;
  const apiCount = collection.rating_count ?? 0;
  const cur = userRating ?? 0;
  const init = initialUserRating;

  // Recalculate average based on user's change
  let avg = apiAvg;
  let count = apiCount;

  if (cur > 0 && init > 0) {
    // Changed vote: swap old for new
    avg = apiCount > 0 ? (apiAvg * apiCount - init + cur) / apiCount : cur;
  } else if (cur > 0 && init === 0) {
    // New vote
    count = apiCount + 1;
    avg = (apiAvg * apiCount + cur) / count;
  } else if (cur === 0 && init > 0) {
    // Removed vote
    count = apiCount - 1;
    avg = count > 0 ? (apiAvg * apiCount - init) / count : 0;
  }

  return (
    <div className="flex items-center gap-1.5">
      <StarRating
        value={avg}
        onChange={(rating) => onRate(collection.id, rating === cur ? 0 : rating)}
      />
      <span className="text-xs text-text-muted">({count})</span>
      {cur > 0 && (
        <button
          onClick={() => onRate(collection.id, 0)}
          className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
          title="Stem verwijderen"
        >
          Jij: {cur}★ ✕
        </button>
      )}
    </div>
  );
}
