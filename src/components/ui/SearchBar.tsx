'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchIngredients?: boolean;
  onSearchIngredientsChange?: (value: boolean) => void;
}

/**
 * Zoekveld (design v2): 44px hoog, crème met rand, radius 14.
 * `onSearchIngredientsChange` toont optioneel een "ook in ingrediënten"-vinkje eronder.
 */
export default function SearchBar({
  value: controlledValue,
  onChange,
  placeholder = 'Zoek recepten...',
  searchIngredients = false,
  onSearchIngredientsChange,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  const handleChange = (val: string) => {
    setInternalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(val);
    }, 400);
  };

  const handleClear = () => {
    setInternalValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange('');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div data-tour="search-bar" className="min-w-0 flex-1 space-y-2">
      <div className="relative w-full">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-ink-3"
          strokeWidth={2}
        />
        <input
          type="search"
          enterKeyHint="search"
          aria-label={searchIngredients ? 'Zoek op ingrediënt' : placeholder}
          value={internalValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          placeholder={searchIngredients ? 'Zoek op ingrediënt...' : placeholder}
          className="h-11 w-full appearance-none truncate rounded-input border border-line bg-surface pl-10 pr-10 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {internalValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Zoekopdracht wissen"
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink-3 hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        )}
      </div>
      {onSearchIngredientsChange && (
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-meta text-ink-3">
          <input
            type="checkbox"
            checked={searchIngredients}
            onChange={(e) => onSearchIngredientsChange(e.target.checked)}
            className="h-4 w-4 rounded border-line-strong text-primary focus:ring-primary/20"
          />
          Zoek ook in ingrediënten
        </label>
      )}
    </div>
  );
}
