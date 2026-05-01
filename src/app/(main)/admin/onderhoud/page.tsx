'use client';

import { useState } from 'react';
import { Flame, Copy, UtensilsCrossed, Loader2, CheckCircle, AlertTriangle, Trash2, Tag } from 'lucide-react';

interface DuplicateRecipe {
  id: string; title: string; image_url: string | null; bron: string | null; created_at: string; user: { display_name: string } | null;
}

interface DuplicatePair {
  original: DuplicateRecipe;
  duplicate: DuplicateRecipe;
  reason: string;
}

export default function OnderhoudPage() {
  // Temperature backfill
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  // Duplicate finder
  const [findingDuplicates, setFindingDuplicates] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<DuplicatePair[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ingredient fixer
  const [fixingIngredients, setFixingIngredients] = useState(false);
  const [ingredientResult, setIngredientResult] = useState<string | null>(null);

  // Bron normalizer
  const [normalizingBronnen, setNormalizingBronnen] = useState(false);
  const [bronResult, setBronResult] = useState<string | null>(null);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch('/api/admin/backfill-temperature', { method: 'POST' });
      const data = await res.json();
      setBackfillResult(`${data.updated} van ${data.total} recepten bijgewerkt met temperatuur`);
    } catch {
      setBackfillResult('Fout bij bijwerken');
    } finally {
      setBackfilling(false);
    }
  };

  const handleFindDuplicates = async () => {
    setFindingDuplicates(true);
    setDuplicatePairs(null);
    try {
      const res = await fetch('/api/admin/duplicates');
      const data = await res.json();
      setDuplicatePairs(data.pairs ?? []);
    } catch {
      setDuplicatePairs([]);
    } finally {
      setFindingDuplicates(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    setDeletingId(recipeId);
    try {
      await fetch('/api/admin/duplicates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      // Remove pair from local state
      setDuplicatePairs((prev) => (prev ?? []).filter((p) => p.original.id !== recipeId && p.duplicate.id !== recipeId));
    } finally {
      setDeletingId(null);
    }
  };

  const handleFixIngredients = async () => {
    setFixingIngredients(true);
    setIngredientResult(null);
    try {
      const res = await fetch('/api/admin/fix-ingredients', { method: 'POST' });
      const data = await res.json();
      const summary = data.message || `${data.fixed} ingrediënten hersteld`;
      // Append a compact dump of every row Claude inspected so we can see
      // exactly why a stubborn row didn't get split. Long-press / select to
      // copy this on a phone.
      const debugLines = Array.isArray(data.debug)
        ? data.debug
            .map(
              (d: any) =>
                `[${d.action}] orig: ${d.orig}\n  -> ${d.parts.join('  ||  ')}`,
            )
            .join('\n\n')
        : '';
      setIngredientResult(debugLines ? `${summary}\n\n${debugLines}` : summary);
    } catch {
      setIngredientResult('Fout bij herstellen');
    } finally {
      setFixingIngredients(false);
    }
  };

  const handleNormalizeBronnen = async () => {
    setNormalizingBronnen(true);
    setBronResult(null);
    try {
      const res = await fetch('/api/admin/normalize-bronnen', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setBronResult(`Fout: ${data.error}`);
      } else if (data.changed === 0) {
        setBronResult(`${data.scanned} bronnen gecontroleerd — alles ziet er al netjes uit`);
      } else {
        const summary = (data.changes || [])
          .map((c: any) => `"${c.from}" → "${c.to}" (${c.updated})`)
          .join(', ');
        setBronResult(`${data.changed} bronnen samengevoegd: ${summary}`);
      }
    } catch {
      setBronResult('Fout bij normaliseren');
    } finally {
      setNormalizingBronnen(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">Onderhoud</h1>

      {/* Tool buttons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Temperature backfill */}
        <button
          onClick={handleBackfill}
          disabled={backfilling}
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-surface p-5 text-center transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {backfilling ? <Loader2 className="h-8 w-8 animate-spin text-amber-500" /> : <Flame className="h-8 w-8 text-amber-500" />}
          <span className="text-sm font-semibold text-text-primary">Temperaturen invullen</span>
          <span className="text-xs text-text-muted">Vul ontbrekende oven- en kerntemperaturen aan vanuit de bereidingsstappen</span>
        </button>

        {/* Duplicate finder */}
        <button
          onClick={handleFindDuplicates}
          disabled={findingDuplicates}
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-surface p-5 text-center transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {findingDuplicates ? <Loader2 className="h-8 w-8 animate-spin text-blue-500" /> : <Copy className="h-8 w-8 text-blue-500" />}
          <span className="text-sm font-semibold text-text-primary">Duplicaten opsporen</span>
          <span className="text-xs text-text-muted">Vind recepten met dezelfde bron, afbeelding of titel</span>
        </button>

        {/* Ingredient fixer */}
        <button
          onClick={handleFixIngredients}
          disabled={fixingIngredients}
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-surface p-5 text-center transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {fixingIngredients ? <Loader2 className="h-8 w-8 animate-spin text-green-600" /> : <UtensilsCrossed className="h-8 w-8 text-green-600" />}
          <span className="text-sm font-semibold text-text-primary">Ingrediënten herstellen</span>
          <span className="text-xs text-text-muted">Herstel hoeveelheden die in de naam zijn terechtgekomen</span>
        </button>

        {/* Bron normalizer */}
        <button
          onClick={handleNormalizeBronnen}
          disabled={normalizingBronnen}
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-surface p-5 text-center transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {normalizingBronnen ? <Loader2 className="h-8 w-8 animate-spin text-purple-600" /> : <Tag className="h-8 w-8 text-purple-600" />}
          <span className="text-sm font-semibold text-text-primary">Bronnen samenvoegen</span>
          <span className="text-xs text-text-muted">Voeg dubbele bron-namen samen (bijv. eefkooktzo.nl → Eef Kookt Zo)</span>
        </button>
      </div>

      {/* Results */}
      {backfillResult && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {backfillResult}
        </div>
      )}

      {ingredientResult && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {ingredientResult}
        </div>
      )}

      {bronResult && (
        <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-3 text-sm text-purple-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {bronResult}
        </div>
      )}

      {/* Duplicate pairs */}
      {duplicatePairs !== null && (
        <div>
          {duplicatePairs.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Geen duplicaten gevonden!
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">
                {duplicatePairs.length} {duplicatePairs.length === 1 ? 'duplicaat' : 'duplicaten'} gevonden
              </h2>
              {duplicatePairs.map((pair, pi) => {
                const renderCard = (r: DuplicateRecipe, label: string, labelColor: string) => (
                  <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="relative">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="h-32 w-full object-cover" />
                      ) : (
                        <div className="flex h-32 w-full items-center justify-center bg-gray-100 text-3xl">🍽️</div>
                      )}
                      <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${labelColor}`}>
                        {label}
                      </span>
                    </div>
                    <div className="p-2">
                      <a href={`/recepten/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline line-clamp-2">
                        {r.title}
                      </a>
                      <p className="mt-0.5 truncate text-[10px] text-text-muted">{r.bron || 'Eigen recept'}</p>
                      <p className="truncate text-[10px] text-text-muted">
                        {(r.user as any)?.display_name || 'Onbekend'} · {new Date(r.created_at).toLocaleDateString('nl-NL')}
                      </p>
                      <button
                        onClick={() => handleDeleteRecipe(r.id)}
                        disabled={deletingId === r.id}
                        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg bg-red-50 py-1.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Verwijder
                      </button>
                    </div>
                  </div>
                );

                return (
                  <div key={pi} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-medium text-amber-800">{pair.reason}</span>
                    </div>
                    <div className="flex gap-2">
                      {renderCard(pair.original, 'Origineel', 'bg-green-600')}
                      <div className="flex shrink-0 items-center text-base text-text-muted">↔</div>
                      {renderCard(pair.duplicate, 'Duplicaat', 'bg-red-500')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
