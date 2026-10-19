import { MONTH_LETTERS, MONTH_NAMES, isYearRound } from '@/lib/ingredients/season';

interface SeasonBarProps {
  months: number[];
  /** Huidige maand (1–12) */
  month: number;
}

/** Seizoensbalk: 12 kolommen, in seizoen = primary, huidige maand met ring en vet label. */
export default function SeasonBar({ months, month }: SeasonBarProps) {
  const active = new Set(months);
  const yearRound = isYearRound(months);
  return (
    <div>
      <div
        role="img"
        aria-label={
          yearRound
            ? 'Jaarrond verkrijgbaar'
            : `In seizoen: ${MONTH_NAMES.filter((_, i) => active.has(i + 1)).join(', ')}`
        }
        className="mt-2.5 grid grid-cols-12 gap-1"
      >
        {MONTH_LETTERS.map((letter, i) => {
          const m = i + 1;
          const inSeason = active.has(m);
          const isCurrent = m === month;
          return (
            <div key={m} className="flex flex-col items-center gap-1.5">
              <span
                className={`h-7 w-full rounded-[7px] ${inSeason ? 'bg-primary' : 'bg-line'} ${
                  isCurrent ? 'shadow-[0_0_0_2px_#F4EFE3,0_0_0_3.5px_#16653a]' : ''
                }`}
              />
              <span className={`text-[11.5px] ${isCurrent ? 'font-bold text-primary' : 'font-medium text-ink-3'}`}>
                {letter}
              </span>
            </div>
          );
        })}
      </div>
      {yearRound && <p className="mt-2 text-meta text-ink-3">Jaarrond verkrijgbaar</p>}
    </div>
  );
}
