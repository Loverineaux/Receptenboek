import Link from 'next/link';
import Image from 'next/image';
import IngredientTile from '@/components/ingredients/IngredientTile';
import type { GenericIngredient } from '@/types';

/** 104px-tegel voor de "In het seizoen"-carrousel: foto of initiaal in categoriekleur. */
export default function SeasonTile({ ingredient }: { ingredient: GenericIngredient }) {
  return (
    <Link
      href={`/ingredienten/${ingredient.id}`}
      className="block w-[104px] shrink-0 rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="relative h-[104px] w-[104px] overflow-hidden rounded-card bg-placeholder">
        {ingredient.image_url ? (
          <Image src={ingredient.image_url} alt={ingredient.name} fill sizes="104px" className="object-cover" />
        ) : (
          <IngredientTile
            name={ingredient.name}
            category={ingredient.category}
            className="h-full w-full text-[34px]"
          />
        )}
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-ink">{ingredient.name}</div>
    </Link>
  );
}
