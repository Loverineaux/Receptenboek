'use client';

interface CategoryFilterProps {
  selected: string | null;
  onChange: (category: string | null) => void;
}

const categories = [
  'Alles',
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

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const handleClick = (cat: string) => {
    onChange(cat === 'Alles' ? null : cat);
  };

  return (
    <div data-tour="category-filter" className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {categories.map((cat) => {
        const isActive = cat === 'Alles' ? selected === null : selected === cat;

        return (
          <button
            key={cat}
            type="button"
            onClick={() => handleClick(cat)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
