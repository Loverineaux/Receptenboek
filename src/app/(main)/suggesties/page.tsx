'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChefHat, ChevronRight, UtensilsCrossed } from 'lucide-react';
import IngredientChips from '@/components/ui/IngredientChips';
import ScreenHeader from '@/components/ui/ScreenHeader';
import SectionHeader from '@/components/ui/SectionHeader';
import Chip from '@/components/ui/Chip';

interface SuggestionResult {
  recipe: any;
  matchCount: number;
  totalCount: number;
  matchPercentage: number;
  matched: string[];
  missing: string[];
}

/** Haalt minuten uit vrije tekst als "25 min", "1 uur 15 min", "1,5 uur". */
function parseMinutes(tijd: string | null | undefined): number | null {
  if (!tijd) return null;
  const t = tijd.toLowerCase().replace(',', '.');
  const hours = t.match(/(\d+(?:\.\d+)?)\s*(?:uur|u\b|h\b)/);
  const mins = t.match(/(\d+)\s*(?:min|m\b)/);
  if (!hours && !mins) {
    const plain = t.match(/^\s*(\d+)\s*$/);
    return plain ? parseInt(plain[1], 10) : null;
  }
  return Math.round((hours ? parseFloat(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0));
}

const VEGA_TAGS = ['vegetarisch', 'veganistisch'];

function isVega(recipe: any): boolean {
  const cats = [recipe.categorie, ...(recipe.tags ?? []).map((t: any) => t?.name)]
    .filter(Boolean)
    .map((c: string) => c.toLowerCase());
  return cats.some((c) => VEGA_TAGS.includes(c));
}

export default function SuggestiesPage() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [results, setResults] = useState<SuggestionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [quick, setQuick] = useState(false);
  const [vega, setVega] = useState(false);

  // Zoek automatisch (met korte vertraging) zodra de selectie verandert
  useEffect(() => {
    if (ingredients.length === 0) {
      setResults([]);
      setSearched(false);
      setError(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch('/api/suggesties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredienten: ingredients }),
          signal: controller.signal,
        });
        if (res.ok) {
          setResults(await res.json());
          setSearched(true);
        } else {
          setError(true);
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [ingredients]);

  const filtered = useMemo(
    () =>
      results.filter((r) => {
        if (quick) {
          const m = parseMinutes(r.recipe.tijd);
          if (m === null || m > 30) return false;
        }
        if (vega && !isVega(r.recipe)) return false;
        return true;
      }),
    [results, quick, vega]
  );

  return (
    <div data-tour="suggesties-page" className="mx-auto max-w-2xl">
      <ScreenHeader title="Wat koken we?" subtitle="Kies wat je hebt, de rest zoeken wij" />

      <div className="pt-5">
        <div className="mb-2.5 text-[13px] font-semibold text-ink-3">Ik heb</div>
        <IngredientChips
          items={ingredients}
          onAdd={(item) => setIngredients((prev) => [...prev, item])}
          onRemove={(item) => setIngredients((prev) => prev.filter((i) => i !== item))}
        />
      </div>

      <div className="-mx-gutter mt-3.5 flex gap-2 overflow-x-auto px-gutter scrollbar-none">
        <Chip active={quick} onClick={() => setQuick((v) => !v)}>
          ≤ 30 min
        </Chip>
        <Chip active={vega} onClick={() => setVega((v) => !v)}>
          Vega
        </Chip>
      </div>

      <SectionHeader
        title="Past nu"
        action={ingredients.length > 0 && !loading ? `${filtered.length} recept${filtered.length === 1 ? '' : 'en'}` : undefined}
      />

      {ingredients.length === 0 && (
        <div className="rounded-card border border-dashed border-line-strong px-5 py-8 text-center text-[15px] text-ink-3">
          Tik hierboven op de ingrediënten die je in huis hebt. Dan laten we zien wat je ermee kunt koken.
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[118px] animate-pulse rounded-card-lg bg-sunk" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="rounded-card border border-line bg-surface px-5 py-6 text-center text-[15px] text-ink-3">
          Zoeken is niet gelukt. Probeer het opnieuw.
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((r) => (
            <SuggestionRow key={r.recipe.id} result={r} />
          ))}
        </div>
      )}

      {!loading && !error && searched && filtered.length === 0 && (
        <div className="rounded-card border border-line bg-surface px-5 py-8 text-center">
          <h2 className="font-display text-lg font-semibold text-ink">Geen recepten gevonden</h2>
          <p className="mt-1 text-[15px] text-ink-3">
            {results.length > 0
              ? 'Haal een filter weg of voeg meer ingrediënten toe.'
              : 'Probeer andere of meer ingrediënten toe te voegen.'}
          </p>
        </div>
      )}

      {/* Er is geen algemene chef-chat; de chef zit per recept. Daarom: zelf een recept schrijven. */}
      <Link
        href="/recepten/nieuw?methode=schrijven"
        className="mt-[18px] flex items-center gap-3.5 rounded-card-lg bg-primary p-4 text-on-primary"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon-btn bg-on-primary/15">
          <ChefHat className="h-[22px] w-[22px]" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Niets dat past?</span>
          <span className="mt-0.5 block text-[13.5px] text-on-primary/80">Schrijf zelf een recept met wat je in huis hebt</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2.2} />
      </Link>
    </div>
  );
}

function SuggestionRow({ result }: { result: SuggestionResult }) {
  const { recipe, totalCount, matched, missing } = result;
  const have = matched?.length ?? result.matchCount;
  const pct = totalCount > 0 ? Math.min(100, Math.round((have / totalCount) * 100)) : 0;
  const mins = parseMinutes(recipe.tijd);
  const timeLabel = mins !== null ? `${mins} min` : recipe.tijd;

  let missingLabel: string;
  if (missing.length === 0) missingLabel = 'alles in huis';
  else {
    const shown = missing.slice(0, 2).join(', ');
    missingLabel = `mist: ${shown}${missing.length > 2 ? ` +${missing.length - 2}` : ''}`;
  }

  return (
    <Link
      href={`/recepten/${recipe.id}`}
      className="flex gap-3.5 rounded-card-lg border border-line-soft bg-surface p-2.5"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[15px] bg-placeholder">
        {recipe.image_url ? (
          <Image src={recipe.image_url} alt={recipe.title} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-4">
            <UtensilsCrossed className="h-7 w-7" strokeWidth={1.8} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-1">
        <div className="line-clamp-2 text-[15.5px] font-semibold leading-snug text-ink">{recipe.title}</div>
        <div className="mt-1 truncate text-[13px] text-ink-3">
          {timeLabel ? `${timeLabel} · ` : ''}
          {missingLabel}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-line-soft">
            <div className="h-full rounded-[3px] bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-[12.5px] font-semibold tabular text-primary">
            {have}/{totalCount} ingrediënten
          </span>
        </div>
      </div>
    </Link>
  );
}
