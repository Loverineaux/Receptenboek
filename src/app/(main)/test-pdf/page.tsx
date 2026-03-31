'use client';

import { useState, useRef } from 'react';
import { FileUp, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface TestRecipe {
  title: string;
  subtitle?: string;
  tijd?: string;
  bron?: string;
  basis_porties?: number;
  ingredients: any[];
  steps: any[];
  nutrition?: any;
  image_data?: string;
  tags?: string[];
}

export default function TestPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState('');
  const [recipes, setRecipes] = useState<TestRecipe[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);
    setRecipes([]);
    setProgress('PDF uploaden...');

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch('/api/extract/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const err = await res.json();
        throw new Error(err.error || 'Extractie mislukt');
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const found: TestRecipe[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'status') {
              setProgress(event.message);
            } else if (event.type === 'batch_done') {
              found.push(...event.recipes);
              setRecipes([...found]);
              setProgress(`${found.length} recepten gevonden...`);
            } else if (event.type === 'done') {
              setRecipes(event.recipes);
              setProgress(`Klaar: ${event.total} recepten`);
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(recipes.map((_, i) => i)));
  const collapseAll = () => setExpanded(new Set());

  // Stats
  const totalIngs = recipes.reduce((s, r) => s + (r.ingredients?.length || 0), 0);
  const totalSteps = recipes.reduce((s, r) => s + (r.steps?.length || 0), 0);
  const withImage = recipes.filter(r => r.image_data).length;
  const withTime = recipes.filter(r => r.tijd).length;
  const withPortions = recipes.filter(r => r.basis_porties).length;
  const ingsWithQty = recipes.reduce((s, r) => s + (r.ingredients || []).filter((i: any) => i.hoeveelheid).length, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">PDF Extractie Test</h1>
        <p className="mt-1 text-sm text-red-500 font-medium">Test-modus — recepten worden NIET opgeslagen</p>
      </div>

      {/* Upload */}
      <div className="rounded-xl border bg-surface p-6 space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
          disabled={extracting}
        />

        {extracting && (
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-4 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium text-text-primary">{progress}</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <Button
          variant="primary"
          onClick={handleExtract}
          loading={extracting}
          disabled={!file || extracting}
        >
          <FileUp className="h-4 w-4" />
          Extracteer (test)
        </Button>
      </div>

      {/* Results */}
      {recipes.length > 0 && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="rounded-xl border bg-surface p-4">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Resultaten: {recipes.length} recepten
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-primary">{recipes.length}</div>
                <div className="text-text-muted">Recepten</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-primary">{ingsWithQty}/{totalIngs}</div>
                <div className="text-text-muted">Ing. met qty</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-primary">{withImage}/{recipes.length}</div>
                <div className="text-text-muted">Met afbeelding</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-primary">{withTime}/{recipes.length}</div>
                <div className="text-text-muted">Met tijd</div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={expandAll} className="text-xs text-primary hover:underline">Alles uitklappen</button>
              <button onClick={collapseAll} className="text-xs text-primary hover:underline">Alles inklappen</button>
            </div>
          </div>

          {/* Recipe cards */}
          {recipes.map((recipe, idx) => {
            const isOpen = expanded.has(idx);
            const ingCount = recipe.ingredients?.length || 0;
            const ingWithQty = (recipe.ingredients || []).filter((i: any) => i.hoeveelheid).length;
            const stepCount = recipe.steps?.length || 0;

            return (
              <div key={idx} className="rounded-xl border bg-surface overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => toggleExpand(idx)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left">
                    {recipe.image_data && (
                      <img src={recipe.image_data} alt="" className="h-10 w-10 rounded object-cover" />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{recipe.title}</h3>
                      <div className="flex gap-3 text-xs text-text-muted">
                        <span>{ingWithQty}/{ingCount} ing.</span>
                        <span>{stepCount} stappen</span>
                        {recipe.tijd && <span>{recipe.tijd}</span>}
                        {recipe.basis_porties && <span>{recipe.basis_porties}p</span>}
                        {recipe.image_data && <span>📷</span>}
                      </div>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                </button>

                {/* Detail */}
                {isOpen && (
                  <div className="border-t px-4 py-4 space-y-4">
                    {/* Image */}
                    {recipe.image_data && (
                      <img src={recipe.image_data} alt="" className="h-40 w-full rounded-lg object-cover" />
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {recipe.bron && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{recipe.bron}</span>}
                      {recipe.tijd && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-text-muted">{recipe.tijd}</span>}
                      {recipe.basis_porties && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-text-muted">{recipe.basis_porties} porties</span>}
                      {(recipe as any).page_number && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">p.{(recipe as any).page_number}</span>}
                      {(recipe.tags || []).map((t: string, i: number) => (
                        <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-text-muted">{t}</span>
                      ))}
                    </div>

                    {/* Temperature */}
                    {(recipe as any).temperatuur && (
                      <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
                        <span className="text-lg">🌡️</span>
                        <span className="text-sm font-semibold text-orange-700">{(recipe as any).temperatuur}</span>
                      </div>
                    )}

                    {recipe.subtitle && (
                      <p className="text-sm italic text-text-secondary border-l-2 border-primary/30 pl-3">{recipe.subtitle}</p>
                    )}

                    {/* Ingredients table with groups */}
                    <div>
                      <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Ingrediënten ({ingCount})</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-text-muted border-b">
                            <th className="pb-1 w-16">Qty</th>
                            <th className="pb-1 w-20">Eenheid</th>
                            <th className="pb-1">Naam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let lastGroup = '';
                            return (recipe.ingredients || []).map((ing: any, i: number) => {
                              const rows = [];
                              if (ing.groep && ing.groep !== lastGroup) {
                                lastGroup = ing.groep;
                                rows.push(
                                  <tr key={`g-${i}`} className="bg-gray-50">
                                    <td colSpan={3} className="py-1.5 px-2 text-xs font-semibold text-text-primary italic">
                                      {ing.groep}
                                    </td>
                                  </tr>
                                );
                              }
                              rows.push(
                                <tr key={i} className="border-b border-gray-50">
                                  <td className={`py-1 font-medium ${ing.hoeveelheid ? 'text-text-primary' : 'text-amber-400'}`}>
                                    {ing.hoeveelheid || '-'}
                                  </td>
                                  <td className={`py-1 ${ing.eenheid ? 'text-text-secondary' : 'text-amber-400'}`}>
                                    {ing.eenheid || '-'}
                                  </td>
                                  <td className="py-1 text-text-primary">{ing.naam}</td>
                                </tr>
                              );
                              return rows;
                            }).flat();
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Steps */}
                    <div>
                      <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">Bereiding ({stepCount})</h4>
                      <ol className="space-y-2">
                        {(recipe.steps || []).map((step: any, i: number) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <span className="shrink-0 font-medium text-primary">{i + 1}.</span>
                            <span className="text-text-secondary">{step.beschrijving}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Nutrition */}
                    {recipe.nutrition && Object.values(recipe.nutrition).some(Boolean) && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-muted uppercase mb-1">Voedingswaarden</h4>
                        <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                          {recipe.nutrition.energie_kcal && <span>{recipe.nutrition.energie_kcal} kcal</span>}
                          {recipe.nutrition.eiwitten && <span>{recipe.nutrition.eiwitten}g eiwit</span>}
                          {recipe.nutrition.koolhydraten && <span>{recipe.nutrition.koolhydraten}g koolh.</span>}
                          {recipe.nutrition.vetten && <span>{recipe.nutrition.vetten}g vet</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
