'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
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
import { jsonFetcher, SWR_PAGE_OPTIONS } from '@/lib/swr';
import { CATEGORY_FILTERS } from '@/lib/ingredients/category';
import { currentMonth, monthName } from '@/lib/ingredients/season';
import type { GenericIngredient } from '@/types';

type ListIngredient = GenericIngredient & { recipe_count?: number };

const PAGE_SIZE = 50;

export default function IngrediëntenPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  // Index in CATEGORY_FILTERS, null = Alles
  const [categoryIdx, setCategoryIdx] = useState<number | null>(null);

  const month = useMemo(() => currentMonth(), []);
  const categoryParam = categoryIdx === null ? '' : CATEGORY_FILTERS[categoryIdx].values.join(',');

  // Lijst met "Laad meer": alle geladen pagina's blijven per zoekterm/categorie in de SWR-cache
  const {
    data: pages,
    error: listError,
    size,
    setSize,
    isLoading: listFetching,
  } = useSWRInfinite<{ ingredients?: ListIngredient[]; total?: number }>(
    (index) => ['ingredients-list', search, categoryParam, index],
    ([, q, cat, index]: [string, string, string, number]) => {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (cat) params.set('category', cat);
      params.set('limit', String(PAGE_SIZE));
      if (index > 0) params.set('offset', String(index * PAGE_SIZE));
      return jsonFetcher(`/api/ingredients?${params.toString()}`).then((d: any) =>
        Array.isArray(d) ? { ingredients: d } : d
      );
    },
    { ...SWR_PAGE_OPTIONS, revalidateFirstPage: true }
  );

  const ingredients = useMemo(
    () => (pages ?? []).flatMap((p) => p?.ingredients ?? []),
    [pages]
  );
  const lastPage = pages?.[pages.length - 1];
  const hasMore = !!lastPage && (lastPage.ingredients?.length ?? 0) >= PAGE_SIZE;
  const loading = pages === undefined && !listError;
  const loadingMore = size > 1 && !!pages && pages[size - 1] === undefined;
  const total = typeof pages?.[0]?.total === 'number' ? pages[0].total : 0;
  // Subtiele indicator als een nieuwe filter laadt terwijl de oude lijst nog zichtbaar is
  const switching = listFetching && pages !== undefined;

  // Totaal van de hele bibliotheek (voor de ondertitel)
  const { data: totalData } = useSWR<{ total?: number }>(
    ['ingredients-total'],
    () => jsonFetcher('/api/ingredients?limit=1'),
    SWR_PAGE_OPTIONS
  );
  const libraryTotal =
    !search && !categoryParam && typeof pages?.[0]?.total === 'number'
      ? pages[0].total!
      : typeof totalData?.total === 'number'
        ? totalData.total
        : null;

  // Seizoensingrediënten van deze maand (niet jaarrond)
  const { data: seasonalData } = useSWR<{ ingredients?: GenericIngredient[] }>(
    ['ingredients-seasonal', month, categoryParam],
    () => {
      const params = new URLSearchParams({ season_month: String(month), limit: '20' });
      if (categoryParam) params.set('category', categoryParam);
      return jsonFetcher(`/api/ingredients?${params.toString()}`);
    },
    SWR_PAGE_OPTIONS
  );
  const seasonal = seasonalData?.ingredients ?? [];

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
          <div className={`rounded-card-lg border border-line bg-surface px-3.5 transition-opacity ${switching ? 'opacity-60' : ''}`}>
            {ingredients.map((ingredient) => (
              <IngredientRow key={ingredient.id} ingredient={ingredient} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={() => setSize(size + 1)} disabled={loadingMore}>
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
