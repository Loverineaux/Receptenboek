import { categoryTint, initialOf } from '@/lib/ingredients/category';

/** Initiaal-tegel in categoriekleur (lijstrijen 40px, seizoenstegels 104px). */
export default function IngredientTile({
  name,
  category,
  className = '',
}: {
  name: string;
  category: string | null;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-display font-semibold text-ink ${categoryTint(category)} ${className}`}
    >
      {initialOf(name)}
    </div>
  );
}
