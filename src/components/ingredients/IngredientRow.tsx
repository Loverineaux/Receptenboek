import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import IngredientTile from '@/components/ingredients/IngredientTile';
import { categoryLabel, formatNumberNl } from '@/lib/ingredients/category';
import type { GenericIngredient } from '@/types';

interface IngredientRowProps {
  ingredient: GenericIngredient & { recipe_count?: number };
}

/** Lijstrij (design v2): 40px initiaal-tegel, naam, "Groente · 25 kcal / 100 g", aantal recepten + chevron. */
export default function IngredientRow({ ingredient }: IngredientRowProps) {
  const count = ingredient.recipe_count ?? 0;
  const meta = [
    categoryLabel(ingredient.category),
    ingredient.avg_kcal != null ? `${formatNumberNl(Math.round(ingredient.avg_kcal))} kcal / 100 g` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/ingredienten/${ingredient.id}`}
      className="flex min-h-[62px] items-center gap-3 border-b border-line-soft py-2 last:border-b-0 focus:outline-none focus-visible:bg-sunk/60"
    >
      <IngredientTile
        name={ingredient.name}
        category={ingredient.category}
        className="h-10 w-10 rounded-icon-btn text-[18px]"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-semibold text-ink">{ingredient.name}</div>
        <div className="mt-0.5 truncate text-meta text-ink-3">{meta}</div>
      </div>
      {count > 0 && (
        <span className="shrink-0 whitespace-nowrap text-meta text-ink-3">
          {count} {count === 1 ? 'recept' : 'recepten'}
        </span>
      )}
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-4" strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}
