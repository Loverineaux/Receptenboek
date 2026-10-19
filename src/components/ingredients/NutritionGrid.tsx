import { formatNumberNl } from '@/lib/ingredients/category';

interface NutritionGridProps {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

/** "Per 100 gram": 4-koloms kaart met kcal, eiwit, koolhydraten, vet (komma-decimalen). */
export default function NutritionGrid({ kcal, protein, carbs, fat }: NutritionGridProps) {
  const cells: { value: string; label: string }[] = [
    { value: kcal != null ? formatNumberNl(Math.round(kcal)) : '–', label: 'kcal' },
    { value: protein != null ? `${formatNumberNl(protein)} g` : '–', label: 'eiwit' },
    { value: carbs != null ? `${formatNumberNl(carbs)} g` : '–', label: 'koolh.' },
    { value: fat != null ? `${formatNumberNl(fat)} g` : '–', label: 'vet' },
  ];
  return (
    <div className="mt-2.5 grid grid-cols-4 rounded-[18px] border border-line bg-surface">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`px-1.5 py-3 text-center ${i < cells.length - 1 ? 'border-r border-line-soft' : ''}`}
        >
          <div className="tabular text-[17px] font-semibold text-ink">{c.value}</div>
          <div className="mt-0.5 text-xs text-ink-3">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
