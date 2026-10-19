interface ProfileStatsProps {
  recipes: number | null;
  collections: number | null;
  cooked: number | null;
}

const fmt = (n: number | null) => (n === null ? '–' : n.toLocaleString('nl-NL'));

/** Stats-kaart (design v2): 3 kolommen met grote Bricolage-cijfers. */
export default function ProfileStats({ recipes, collections, cooked }: ProfileStatsProps) {
  const items = [
    { value: recipes, label: 'Recepten' },
    { value: collections, label: 'Collecties' },
    { value: cooked, label: 'Gekookt' },
  ];
  return (
    <dl className="grid grid-cols-3 rounded-card border border-line bg-surface">
      {items.map((item, i) => (
        <div key={item.label} className={`p-3.5 text-center ${i < items.length - 1 ? 'border-r border-line-soft' : ''}`}>
          <dd className="font-display text-[25px] font-semibold leading-none text-ink tabular">{fmt(item.value)}</dd>
          <dt className="mt-1 text-[12.5px] text-ink-3">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}
