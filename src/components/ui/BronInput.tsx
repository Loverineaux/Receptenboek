'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BronInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function BronInput({ value, onChange, disabled }: BronInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allBronnen, setAllBronnen] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all unique bronnen on mount
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('recipes')
      .select('bron')
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map((r: any) => r.bron).filter(Boolean))) as string[];
          unique.sort((a, b) => a.localeCompare(b));
          setAllBronnen(unique);
        }
      });
  }, []);

  // Filter suggestions on input
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions(allBronnen);
    } else {
      const lower = value.toLowerCase();
      setSuggestions(
        allBronnen.filter((b) => b.toLowerCase().includes(lower))
      );
    }
    setActiveIndex(-1);
  }, [value, allBronnen]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onChange(suggestions[activeIndex]);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="mb-1.5 block text-sm font-medium text-text-primary">
        Bron (optioneel)
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Bijv. naam kookboek, website..."
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-surface py-1 shadow-lg">
          {suggestions.map((bron, idx) => (
            <li
              key={bron}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                idx === activeIndex
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-primary hover:bg-gray-50'
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => {
                onChange(bron);
                setOpen(false);
                inputRef.current?.focus();
              }}
            >
              {bron}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
