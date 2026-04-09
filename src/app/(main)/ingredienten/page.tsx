'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Apple, ScanLine } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import IngredientCard from '@/components/ingredients/IngredientCard';
import type { GenericIngredient } from '@/types';

const CATEGORIES = [
  'vlees',
  'groente',
  'fruit',
  'zuivel',
  'kruiden',
  'granen',
  'vis',
  'overig',
] as const;

export default function IngrediëntenPage() {
  const router = useRouter();

  const [ingredients, setIngredients] = useState<GenericIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  const fetchIngredients = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('limit', String(PAGE_SIZE));
      if (loadMore) params.set('offset', String(ingredients.length));
      const qs = params.toString();
      const res = await fetch(`/api/ingredients?${qs}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.ingredients ?? data;
        if (loadMore) {
          setIngredients((prev) => [...prev, ...items]);
        } else {
          setIngredients(items);
        }
        setHasMore(items.length >= PAGE_SIZE);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, category, ingredients.length]);

  useEffect(() => {
    setHasMore(true);
    fetchIngredients(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <Apple className="h-6 w-6" />
          Ingredi&euml;nten
        </h1>

        <button
          type="button"
          onClick={() => router.push('/ingredienten/scan')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden sm:inline">Scan product</span>
        </button>
      </div>

      {/* Search */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Zoek ingredi&euml;nten..."
      />

      {/* Category filter chips */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            category === null
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          }`}
        >
          Alles
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(category === cat ? null : cat)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              category === cat
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      )}

      {/* Ingredient grid */}
      {!loading && ingredients.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {ingredients.map((ingredient) => (
              <IngredientCard key={ingredient.id} ingredient={ingredient} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => fetchIngredients(true)}
                disabled={loadingMore}
                className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                {loadingMore ? 'Laden...' : 'Laad meer'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && ingredients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl">🫙</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            Nog geen ingredi&euml;nten gevonden.
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Scan een product om ingredi&euml;nten toe te voegen aan je
            bibliotheek.
          </p>
          <button
            type="button"
            onClick={() => router.push('/ingredienten/scan')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            <ScanLine className="h-4 w-4" />
            Scan product
          </button>
        </div>
      )}
    </div>
  );
}
