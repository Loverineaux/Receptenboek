'use client';

import BottomSheet from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import { ALL_CATEGORIES } from '@/components/ui/CategoryFilter';

interface FilterOption {
  value: string;
  label: string;
}

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
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
  onResetAll?: () => void;
  /** Volledige categorielijst (de chips op het scherm tonen alleen de snelle keuzes) */
  category?: string | null;
  onCategoryChange?: (category: string | null) => void;
  searchIngredients?: boolean;
  onSearchIngredientsChange?: (value: boolean) => void;
  /** Aantal actieve filters, voor de "Alles wissen"-knop */
  activeCount?: number;
}

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5">
      <h3 className="text-[15px] font-semibold text-ink">{children}</h3>
      {hint && <p className="mt-0.5 text-meta text-ink-3">{hint}</p>}
    </div>
  );
}

/**
 * Filterpaneel (design v2): sortering, categorie, zoekopties en bronnen in een
 * BottomSheet. Wordt geopend via de filterknop in de kop van /recepten.
 */
export default function MobileFilterSheet({
  open,
  onClose,
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
  onResetAll,
  category,
  onCategoryChange,
  searchIngredients,
  onSearchIngredientsChange,
  activeCount = 0,
}: MobileFilterSheetProps) {
  const cycleSource = (value: string) => {
    const included = includedSources.has(value);
    const excluded = excludedSources.has(value);
    if (!included && !excluded) {
      onIncludedSourceToggle?.(value);
      if (source) onSourceChange('');
    } else {
      // ingesloten → verbergen (de toggle haalt hem ook uit de ingesloten set);
      // verborgen → weer neutraal
      onExcludedSourceToggle(value);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="space-y-1">
          <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
            Toepassen
          </Button>
          {activeCount > 0 && onResetAll && (
            <Button
              variant="ghost"
              size="md"
              className="w-full"
              onClick={() => { onResetAll(); onClose(); }}
            >
              Alle filters wissen
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 pt-1">
        <div>
          <SectionLabel>Sorteren</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((s) => (
              <Chip key={s.value} active={sort === s.value} onClick={() => onSortChange(s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        {onCategoryChange && (
          <div>
            <SectionLabel>Categorie</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <Chip active={!category} onClick={() => onCategoryChange(null)}>
                Alles
              </Chip>
              {ALL_CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  active={category?.toLowerCase() === c.toLowerCase()}
                  onClick={() => onCategoryChange(c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {onSearchIngredientsChange && (
          <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 rounded-input border border-line bg-surface px-4">
            <span className="text-[15px] text-ink">Zoek ook in ingrediënten</span>
            <input
              type="checkbox"
              checked={!!searchIngredients}
              onChange={(e) => onSearchIngredientsChange(e.target.checked)}
              className="h-5 w-5 rounded-[6px] border-line-strong text-primary focus:ring-primary/20"
            />
          </label>
        )}

        {sourceOptions.length > 0 && (
          <div>
            <SectionLabel hint="Tik om te tonen (groen), tik nogmaals om te verbergen (rood)">Bronnen</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map((s) => {
                const included = includedSources.has(s.value);
                const excluded = excludedSources.has(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => cycleSource(s.value)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onExcludedSourceToggle(s.value);
                    }}
                    className={`inline-flex h-10 items-center rounded-chip border px-4 text-sm font-medium transition-colors ${
                      included
                        ? 'border-primary bg-primary-tint text-primary'
                        : excluded
                          ? 'border-red-200 bg-red-50 text-red-700 line-through'
                          : 'border-line bg-surface text-ink hover:bg-gray-50'
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
                className="mt-2 min-h-[44px] text-meta font-semibold text-primary"
              >
                Bronfilters wissen
              </button>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
