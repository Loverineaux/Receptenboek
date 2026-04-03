'use client';

import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

interface IngredientChipsProps {
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
}

const COMMON_INGREDIENTS = [
  'kip', 'rijst', 'pasta', 'aardappelen', 'ui', 'knoflook',
  'paprika', 'tomaat', 'ei', 'kaas', 'wortel', 'broccoli',
];

export default function IngredientChips({ items, onAdd, onRemove }: IngredientChipsProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const suggestionsToShow = COMMON_INGREDIENTS.filter(
    (s) => !items.includes(s)
  );

  return (
    <div className="space-y-3">
      {/* Input area with chips */}
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-300 bg-surface px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
        onClick={() => inputRef.current?.focus()}
      >
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
          >
            {item}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(item); }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          enterKeyHint="done"
          placeholder={items.length === 0 ? 'Typ een ingrediënt...' : 'Nog een...'}
          className="min-w-[100px] flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={() => addItem(input)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Common ingredient suggestions */}
      {items.length < 8 && suggestionsToShow.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestionsToShow.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addItem(s)}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
