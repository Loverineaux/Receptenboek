'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine } from 'lucide-react';
import ScreenHeader from '@/components/ui/ScreenHeader';
import SectionHeader from '@/components/ui/SectionHeader';
import IconButton from '@/components/ui/IconButton';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import IngredientRow from '@/components/ingredients/IngredientRow';
import SeasonTile from '@/components/ingredients/SeasonTile';
import { CATEGORY_FILTERS } from '@/lib/ingredients/category';
import { currentMonth, monthName } from '@/lib/ingredients/season';
import type { GenericIngredient } from '@/types';

type ListIngredient = GenericIngredient & { recipe_count?: number };

const PAGE_SIZE = 50;

export default function IngrediëntenPage() {
  const router = useRouter();

  const [ingredients, setIngredients] = useState<ListIngredient[]>([]);
  const [total, setTotal] = useState(0);
  const [libraryTotal, setLibraryTotal] = useState<number | null>(null);
  const [seasonal, setSeasonal] = useState<GenericIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  // Index in CATEGORY_FILTERS, null = Alles
  const [categoryIdx, setCategoryIdx] = useState<number | null>(null);

  const month = useMemo(() => currentMonth(), []);
  const categoryParam = categoryIdx === null ? '' : CATEGORY_FILTERS[categoryIdx].values.join(',');

  const fetchIngredients = useCallback(
    async (loadMore = false) => {
      if (loadMore) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (categoryParam) params.set('category', categoryParam);
        params.set('limit', String(PAGE_SIZE));
        if (loadMore) params.set('offset', String(ingredients.length));
        const res = await fetch(`/api/ingredients?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const items: ListIngredient[] = data.ingredients ?? data;
          setIngredients((prev) => (loadMore ? [...prev, ...items] : items));
          if (typeof data.total === 'number') {
            setTotal(data.total);
            if (!search && !categoryParam) setLibraryTotal(data.total);
          }
          setHasMore(items.length >= PAGE_SIZE);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, categoryParam, ingredients.length]
  );

  useEffect(() => {
    setHasMore(true);
    fetchIngredients(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryParam]);

  // Totaal van de hele bibliotheek (voor de ondertitel) als de eerste lijst gefilterd is
  useEffect(() => {
    if (libraryTotal !== null) return;
    fetch('/api/ingredients?limit=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.total === 'number') setLibraryTotal(d.total);
      })
      .catch(() => {});
  }, [libraryTotal]);

  // Seizoensingrediënten van deze maand (niet jaarrond)
  useEffect(() => {
    const params = new URLSearchParams({ season_month: String(month), limit: '20' });
    if (categoryParam) params.set('category', categoryParam);
    let cancelled = false;
    fetch(`/api/ingredients?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setSeasonal(d?.ingredients ?? []);
      })
      .catch(() => {
        if (!cancelled) setSeasonal([]);
      });
    return () => {
      cancelled = true;
    };
  }, [month, categoryParam]);

  const isFiltered = !!search || categoryIdx !== null;
  const listTitle = categoryIdx !== null ? CATEGORY_FILTERS[categoryIdx].label : 'Alle ingrediënten';

  return (
    <div data-tour="ingredienten-page" className="md:mx-auto md:max-w-3xl">
      <ScreenHeader
        title="Ingrediënten"
        subtitle={
          libraryTotal !== null ? `${libraryTotal.toLocaleString('nl-NL')} in de bibliotheek` : undefined
        }
        actions={
          <IconButton variant="primary" label="Product scannen" onClick={() => router.push('/ingredienten/scan')}>
            <ScanLine className="h-[19px] w-[19px]" strokeWidth={1.9} />
          </IconButton>
        }
      />

      <div className="mt-[18px]">
        <SearchBar value={search} onChange={setSearch} placeholder="Zoek een ingrediënt" />
      </div>

      {/* Categorie-chips */}
      <div className="-mx-gutter mt-3.5 flex gap-2 overflow-x-auto px-gutter scrollbar-none md:mx-0 md:px-0">
        <Chip active={categoryIdx === null} onClick={() => setCategoryIdx(null)}>
          Alles
        </Chip>
        {CATEGORY_FILTERS.map((c, i) => (
          <Chip key={c.label} active={categoryIdx === i} onClick={() => setCategoryIdx(categoryIdx === i ? null : i)}>
            {c.label}
          </Chip>
        ))}
      </div>

      {/* In het seizoen */}
      {!search && seasonal.length > 0 && (
        <section aria-label="In het seizoen">
          <SectionHeader title="In het seizoen" action={monthName(month)} />
          <div className="-mx-gutter flex gap-3 overflow-x-auto px-gutter scrollbar-none md:mx-0 md:px-0">
            {seasonal.map((ing) => (
              <SeasonTile key={ing.id} ingredient={ing} />
            ))}
          </div>
        </section>
      )}

      {/* Lijst */}
      <SectionHeader
        title={listTitle}
        action={isFiltered && !loading ? `${total.toLocaleString('nl-NL')} gevonden` : undefined}
      />

      {loading && (
        <div className="rounded-card-lg border border-line bg-surface px-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex min-h-[62px] items-center gap-3 border-b border-line-soft last:border-b-0">
              <div className="h-10 w-10 animate-pulse rounded-icon-btn bg-sunk" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-sunk" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-sunk" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && ingredients.length > 0 && (
        <>
          <div className="rounded-card-lg border border-line bg-surface px-3.5">
            {ingredients.map((ingredient) => (
              <IngredientRow key={ingredient.id} ingredient={ingredient} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={() => fetchIngredients(true)} disabled={loadingMore}>
                {loadingMore ? 'Laden...' : 'Laad meer'}
              </Button>
            </div>
          )}
        </>
      )}

      {!loading && ingredients.length === 0 && (
        <div className="rounded-card-lg border border-dashed border-line-strong px-6 py-12 text-center">
          <h2 className="font-display text-section font-semibold text-ink">Geen ingrediënten gevonden</h2>
          <p className="mt-1.5 text-[15px] text-ink-3">
            {isFiltered
              ? 'Probeer een andere zoekterm of categorie.'
              : 'Scan een product om ingrediënten toe te voegen aan je bibliotheek.'}
          </p>
          {!isFiltered && (
            <div className="mt-5 flex justify-center">
              <Button onClick={() => router.push('/ingredienten/scan')}>
                <ScanLine className="h-4 w-4" />
                Product scannen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
