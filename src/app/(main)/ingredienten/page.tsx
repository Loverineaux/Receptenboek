'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Apple, ScanLine, Link2 } from 'lucide-react';
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

interface BatchEvent {
  type: 'status' | 'matched' | 'skip' | 'complete';
  processed?: number;
  total?: number;
  naam?: string;
  match?: string;
}

export default function IngrediëntenPage() {
  const router = useRouter();

  const [ingredients, setIngredients] = useState<GenericIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  // Batch match state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProcessed, setBatchProcessed] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchStatus, setBatchStatus] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      const qs = params.toString();
      const res = await fetch(`/api/ingredients${qs ? `?${qs}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setIngredients(data);
      }
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const startBatchMatch = async () => {
    if (batchRunning) return;

    setBatchRunning(true);
    setBatchProcessed(0);
    setBatchTotal(0);
    setBatchStatus('Bezig met koppelen...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ingredients/batch-match', {
        method: 'POST',
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setBatchStatus('Fout bij koppelen');
        setBatchRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const json = trimmed.slice(5).trim();
          if (!json) continue;

          try {
            const event: BatchEvent = JSON.parse(json);

            if (event.processed != null) setBatchProcessed(event.processed);
            if (event.total != null) setBatchTotal(event.total);

            switch (event.type) {
              case 'status':
                setBatchStatus(event.naam ?? 'Bezig...');
                break;
              case 'matched':
                setBatchStatus(`Gekoppeld: ${event.naam} → ${event.match}`);
                break;
              case 'skip':
                setBatchStatus(`Overgeslagen: ${event.naam}`);
                break;
              case 'complete':
                setBatchStatus('Koppelen voltooid!');
                break;
            }
          } catch {
            // ignore malformed events
          }
        }
      }

      // Refresh list after completion
      await fetchIngredients();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setBatchStatus('Fout bij koppelen');
      }
    } finally {
      setBatchRunning(false);
      abortRef.current = null;
    }
  };

  const progressPercent =
    batchTotal > 0 ? Math.round((batchProcessed / batchTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Batch match progress bar */}
      {batchRunning && (
        <div className="sticky top-0 z-30 -mx-4 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-text-primary">
              {batchStatus}
            </span>
            <span className="text-text-muted">
              {batchProcessed}/{batchTotal} ({progressPercent}%)
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <Apple className="h-6 w-6" />
          Ingredi&euml;nten
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/ingredienten/scan')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">Scan product</span>
          </button>
          <button
            type="button"
            onClick={startBatchMatch}
            disabled={batchRunning}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Koppel ingredi&euml;nten</span>
          </button>
        </div>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {ingredients.map((ingredient) => (
            <IngredientCard key={ingredient.id} ingredient={ingredient} />
          ))}
        </div>
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
