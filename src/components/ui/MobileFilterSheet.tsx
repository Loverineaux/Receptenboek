'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface FilterOption {
  value: string;
  label: string;
}

interface MobileFilterSheetProps {
  source: string;
  onSourceChange: (value: string) => void;
  sourceOptions: FilterOption[];
  includedSources?: Set<string>;
  onIncludedSourceToggle?: (source: string) => void;
  onClearIncluded?: () => void;
  excludedSources: Set<string>;
  onExcludedSourceToggle: (source: string) => void;
  onClearExcluded: () => void;
  sort: string;
  onSortChange: (value: string) => void;
  sortOptions: FilterOption[];
}

export default function MobileFilterSheet({
  source,
  onSourceChange,
  sourceOptions,
  includedSources = new Set(),
  onIncludedSourceToggle,
  onClearIncluded,
  excludedSources,
  onExcludedSourceToggle,
  onClearExcluded,
  sort,
  onSortChange,
  sortOptions,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  const activeFilterCount =
    (source ? 1 : 0) + includedSources.size + excludedSources.size + (sort !== 'newest' ? 1 : 0);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Mobile: filter button */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm text-text-primary transition-colors hover:bg-gray-50"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop: inline filters */}
      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
        {/* Source chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-text-muted">Bron:</span>
          {sourceOptions.map((s) => {
            const included = includedSources.has(s.value);
            const excluded = excludedSources.has(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  if (excluded) { onExcludedSourceToggle(s.value); }
                  else if (included) { onIncludedSourceToggle?.(s.value); }
                  else { onIncludedSourceToggle?.(s.value); if (source) onSourceChange(''); }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (included) onIncludedSourceToggle?.(s.value);
                  if (!excluded) onExcludedSourceToggle(s.value);
                  else onExcludedSourceToggle(s.value);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  included ? 'bg-green-100 text-green-700' :
                  excluded ? 'bg-red-100 text-red-700 line-through' :
                  'bg-gray-100 text-text-secondary hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            );
          })}
          {(includedSources.size > 0 || excludedSources.size > 0) && (
            <button
              type="button"
              onClick={() => { onClearIncluded?.(); onClearExcluded(); if (source) onSourceChange(''); }}
              className="text-[10px] text-text-muted hover:text-text-secondary"
            >
              reset
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-gray-200" />

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {sortOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Bottom sheet overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface pb-8 shadow-xl animate-in slide-in-from-bottom">
            {/* Handle */}
            <div className="sticky top-0 z-10 bg-surface pb-2 pt-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
              <div className="mt-3 flex items-center justify-between px-5">
                <h3 className="text-lg font-semibold text-text-primary">Filters</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 px-5 pt-2">
              {/* Sort */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Sorteren</label>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => onSortChange(s.value)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        sort === s.value
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-text-secondary'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source filter — multi-select with toon/verberg */}
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Bronnen</label>
                <p className="mb-2 text-xs text-text-muted">Tik om te filteren (groen) of lang indrukken om te verbergen (rood)</p>
                <div className="flex flex-wrap gap-2">
                  {sourceOptions.map((s) => {
                    const included = includedSources.has(s.value);
                    const excluded = excludedSources.has(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => {
                          if (excluded) {
                            // Unexclude
                            onExcludedSourceToggle(s.value);
                          } else if (included) {
                            // Uninclude
                            onIncludedSourceToggle?.(s.value);
                          } else {
                            // Include
                            onIncludedSourceToggle?.(s.value);
                            // Clear single source filter
                            if (source) onSourceChange('');
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (included) onIncludedSourceToggle?.(s.value);
                          if (!excluded) {
                            onExcludedSourceToggle(s.value);
                          } else {
                            onExcludedSourceToggle(s.value);
                          }
                        }}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          included
                            ? 'bg-green-100 text-green-700'
                            : excluded
                            ? 'bg-red-100 text-red-700 line-through'
                            : 'bg-gray-100 text-text-secondary'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                {(includedSources.size > 0 || excludedSources.size > 0) && (
                  <button
                    type="button"
                    onClick={() => { onClearIncluded?.(); onClearExcluded(); if (source) onSourceChange(''); }}
                    className="mt-2 text-xs text-text-muted hover:text-text-secondary"
                  >
                    Filters wissen
                  </button>
                )}
              </div>
            </div>

            {/* Apply button */}
            <div className="px-5 pt-6">
              <Button variant="primary" size="lg" className="w-full" onClick={() => setOpen(false)}>
                Toepassen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
