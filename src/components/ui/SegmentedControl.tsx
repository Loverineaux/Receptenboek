'use client';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Segmented control (design v2): track zandgrijs radius 16 + padding 4,
 * tabs 40px radius 12, actieve tab crème met lichte schaduw.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div role="tablist" className={`flex rounded-2xl bg-sunk p-1 ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`h-10 flex-1 rounded-xl text-[15px] font-semibold transition-colors duration-150 ${
              active ? 'bg-surface text-ink shadow-seg' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
