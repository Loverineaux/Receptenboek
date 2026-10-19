'use client';

import Chip from '@/components/ui/Chip';

interface CategoryFilterProps {
  selected: string | null;
  onChange: (category: string | null) => void;
  /** "Snel"-chip (bereidingstijd ≤ 30 min) is een aparte, client-side filter */
  quick?: boolean;
  onQuickChange?: (quick: boolean) => void;
}

/** Volledige lijst tag-categorieën (beschikbaar in het filterpaneel). */
export const ALL_CATEGORIES = [
  'Kip',
  'Vlees',
  'Vis',
  'Vegetarisch',
  'Veganistisch',
  'Pasta',
  'Salade',
  'Soep',
  'Ontbijt',
  'Lunch',
  'Dessert',
];

type QuickChip = { kind: 'all' } | { kind: 'quick' } | { kind: 'category'; category: string };

// Snelle keuzes uit het ontwerp, bovenop de bestaande tag-categorieën.
const CHIPS: Array<{ label: string; chip: QuickChip }> = [
  { label: 'Alles', chip: { kind: 'all' } },
  { label: 'Snel', chip: { kind: 'quick' } },
  { label: 'Vega', chip: { kind: 'category', category: 'Vegetarisch' } },
  { label: 'Pasta', chip: { kind: 'category', category: 'Pasta' } },
  { label: 'Soep', chip: { kind: 'category', category: 'Soep' } },
  { label: 'Zoet', chip: { kind: 'category', category: 'Dessert' } },
];

export default function CategoryFilter({ selected, onChange, quick = false, onQuickChange }: CategoryFilterProps) {
  const handleClick = (chip: QuickChip) => {
    if (chip.kind === 'all') {
      onChange(null);
      onQuickChange?.(false);
    } else if (chip.kind === 'quick') {
      onChange(null);
      onQuickChange?.(true);
    } else {
      onChange(chip.category);
      onQuickChange?.(false);
    }
  };

  return (
    <div data-tour="category-filter" className="flex gap-2 overflow-x-auto scrollbar-none">
      {CHIPS.map(({ label, chip }) => {
        const isActive =
          chip.kind === 'all'
            ? selected === null && !quick
            : chip.kind === 'quick'
              ? quick
              : !quick && selected?.toLowerCase() === chip.category.toLowerCase();
        return (
          <Chip key={label} active={isActive} onClick={() => handleClick(chip)} className="h-9">
            {label}
          </Chip>
        );
      })}
    </div>
  );
}
