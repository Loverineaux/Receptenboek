'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import Chip from '@/components/ui/Chip';

interface IngredientChipsProps {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
}

const FALLBACK_INGREDIENTS = [
  'kip', 'rijst', 'pasta', 'aardappelen', 'ui', 'knoflook',
  'paprika', 'tomaat', 'ei', 'kaas', 'wortel', 'broccoli',
];

/**
 * "Ik heb"-chips (design v2): wrap-rij met multi-select toggle-chips.
 * Gekozen items staan vooraan (actief, tik om te verwijderen), daarna suggesties.
 * Eigen ingrediënten kunnen via het invoerveld worden toegevoegd.
 */
export default function IngredientChips({ items, onAdd, onRemove }: IngredientChipsProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_INGREDIENTS);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase
      .from('generic_ingredients')
      .select('name')
      .order('name')
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Toon 12 willekeurige ingrediënten als suggestie
          const names = data.map((d) => d.name);
          const shuffled = names.sort(() => Math.random() - 0.5);
          setSuggestions(shuffled.slice(0, 12));
        }
      });
  }, []);

  const addItem = (text: string) => {
    const trimmed = text.trim().toLowerCase();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addItem(input);
    } else if (e.key === 'Backspace' && !input && items.length > 0) {
      onRemove(items[items.length - 1]);
    }
  };

  const suggestionsToShow = suggestions.filter((s) => !items.includes(s));

  return (
    <div className="space-y-3">
      <div className="flex h-11 items-center gap-2 rounded-input border border-line bg-surface pl-3.5 pr-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          enterKeyHint="done"
          aria-label="Eigen ingrediënt toevoegen"
          placeholder="Typ een ander ingrediënt..."
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={() => addItem(input)}
            aria-label={`Voeg ${input.trim()} toe`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon-btn bg-primary text-on-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Chip
            key={item}
            active
            onClick={() => onRemove(item)}
            aria-label={`${item} verwijderen`}
            icon={<X className="h-3.5 w-3.5" strokeWidth={2.4} />}
          >
            {item}
          </Chip>
        ))}
        {suggestionsToShow.map((s) => (
          <Chip key={s} onClick={() => addItem(s)}>
            {s}
          </Chip>
        ))}
      </div>
    </div>
  );
}
