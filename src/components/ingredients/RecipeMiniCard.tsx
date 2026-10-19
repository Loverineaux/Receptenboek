import Link from 'next/link';
import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';

export interface RecipeMini {
  id: string;
  title: string;
  image_url: string | null;
  tijd: string | null;
}

/** 160px receptkaartje voor carrousels (foto 130px, titel, tijd). */
export default function RecipeMiniCard({ recipe }: { recipe: RecipeMini }) {
  return (
    <Link
      href={`/recepten/${recipe.id}`}
      className="block w-[160px] shrink-0 rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="relative h-[130px] w-[160px] overflow-hidden rounded-[18px] bg-placeholder">
        {recipe.image_url ? (
          <Image src={recipe.image_url} alt={recipe.title} fill sizes="160px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-3">
            <UtensilsCrossed className="h-7 w-7" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="mt-2 line-clamp-2 text-[14.5px] font-semibold leading-[1.3] text-ink">{recipe.title}</div>
      {recipe.tijd && <div className="mt-[3px] text-meta text-ink-3">{recipe.tijd}</div>}
    </Link>
  );
}
