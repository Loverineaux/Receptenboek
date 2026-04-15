'use client';

import { useState } from 'react';
import { Flame, Copy, UtensilsCrossed, Loader2, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

interface DuplicateGroup {
  reason: string;
  recipes: { id: string; title: string; image_url: string | null; bron: string | null; created_at: string; user: { display_name: string } | null }[];
}

export default function OnderhoudPage() {
  // Temperature backfill
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  // Duplicate finder
  const [findingDuplicates, setFindingDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ingredient fixer
  const [fixingIngredients, setFixingIngredients] = useState(false);
  const [ingredientResult, setIngredientResult] = useState<string | null>(null);

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
    setDuplicateGroups(null);
    try {
      const res = await fetch('/api/admin/duplicates');
      const data = await res.json();
      setDuplicateGroups(data.groups ?? []);
    } catch {
      setDuplicateGroups([]);
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
      // Remove from local state
      setDuplicateGroups((prev) =>
        (prev ?? [])
          .map((g) => ({ ...g, recipes: g.recipes.filter((r) => r.id !== recipeId) }))
          .filter((g) => g.recipes.length > 1)
      );
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
      setIngredientResult(data.message || `${data.fixed} ingrediënten hersteld`);
    } catch {
      setIngredientResult('Fout bij herstellen');
    } finally {
      setFixingIngredients(false);
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

      {/* Duplicate groups */}
      {duplicateGroups !== null && (
        <div>
          {duplicateGroups.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Geen duplicaten gevonden!
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">
                {duplicateGroups.length} duplicaat-{duplicateGroups.length === 1 ? 'groep' : 'groepen'} gevonden
              </h2>
              {duplicateGroups.map((group, gi) => (
                <div key={gi} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">{group.reason}</span>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">{group.recipes.length} recepten</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.recipes.map((r) => (
                      <div key={r.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {/* Recipe image */}
                        {r.image_url ? (
                          <img src={r.image_url} alt="" className="h-40 w-full object-cover" />
                        ) : (
                          <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-4xl">🍽️</div>
                        )}
                        {/* Recipe info */}
                        <div className="p-3">
                          <a href={`/recepten/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                            {r.title}
                          </a>
                          <p className="mt-1 text-xs text-text-muted">
                            {r.bron || 'Eigen recept'}
                          </p>
                          <p className="text-xs text-text-muted">
                            {(r.user as any)?.display_name || 'Onbekend'} · {new Date(r.created_at).toLocaleDateString('nl-NL')}
                          </p>
                          {(r as any).match_reason && (
                            <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              {(r as any).match_reason}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteRecipe(r.id)}
                            disabled={deletingId === r.id}
                            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-50 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
