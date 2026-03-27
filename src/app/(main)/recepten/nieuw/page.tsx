'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Link as LinkIcon, Camera, FileUp, PenLine, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import RecipeForm, { RecipeFormData } from '@/components/recipes/RecipeForm';
import type { Source, Difficulty } from '@/types';

type ImportTab = 'handmatig' | 'url' | 'tekst' | 'foto' | 'pdf';

const tabs: { key: ImportTab; label: string; icon: React.ReactNode }[] = [
  { key: 'handmatig', label: 'Handmatig', icon: <PenLine className="h-4 w-4" /> },
  { key: 'url', label: 'URL', icon: <LinkIcon className="h-4 w-4" /> },
  { key: 'tekst', label: 'Tekst', icon: <FileText className="h-4 w-4" /> },
  { key: 'foto', label: 'Foto', icon: <Camera className="h-4 w-4" /> },
  { key: 'pdf', label: 'PDF', icon: <FileUp className="h-4 w-4" /> },
];

function mapSource(bron?: string): Source {
  return bron || 'Eigen recept';
}

function mapDifficulty(moeilijkheid?: string): Difficulty {
  if (moeilijkheid === 'Makkelijk' || moeilijkheid === 'Gemiddeld' || moeilijkheid === 'Moeilijk') {
    return moeilijkheid;
  }
  return 'Gemiddeld';
}

/** Map AI extraction output to the format the POST /api/recipes expects */
function mapExtractedToFormData(extracted: any, sourceUrl?: string): RecipeFormData {
  const nutrition = extracted.nutrition;
  const mappedNutrition = nutrition
    ? {
        energie_kcal: nutrition.energie_kcal || '',
        energie_kj: nutrition.energie_kj || '',
        vetten: nutrition.vetten || '',
        verzadigd: nutrition.verzadigd || '',
        koolhydraten: nutrition.koolhydraten || '',
        suikers: nutrition.suikers || '',
        vezels: nutrition.vezels || '',
        eiwitten: nutrition.eiwitten || '',
        zout: nutrition.zout || '',
      }
    : null;

  return {
    title: extracted.title || 'Naamloos recept',
    subtitle: extracted.subtitle || '',
    image_url: extracted.image_url || '',
    tijd: extracted.tijd || '',
    moeilijkheid: mapDifficulty(extracted.moeilijkheid),
    bron: mapSource(extracted.bron),
    basis_porties: extracted.basis_porties ?? 2,
    is_public: false,
    weetje: extracted.weetje || '',
    allergenen: extracted.allergenen || '',
    ingredients: (extracted.ingredients ?? [])
      .filter((i: any) => i.naam)
      .map((i: any) => ({
        hoeveelheid: i.hoeveelheid ? String(i.hoeveelheid) : '',
        eenheid: i.eenheid || '',
        naam: i.naam.trim(),
      })),
    steps: (extracted.steps ?? [])
      .filter((s: any) => s.beschrijving)
      .map((s: any) => ({
        titel: s.titel || '',
        beschrijving: s.beschrijving.trim(),
        afbeelding_url: s.afbeelding_url || '',
      })),
    nutrition: mappedNutrition,
    benodigdheden: (extracted.benodigdheden ?? [])
      .map((b: any) => (typeof b === 'string' ? b : b.naam))
      .filter(Boolean),
    tags: extracted.tags ?? [],
  };
}

const PROGRESS_STEPS = [
  'Recept ophalen van URL...',
  'Ingrediënten herkennen...',
  'Bereidingsstappen verwerken...',
  'Voedingswaarden extraheren...',
  'Recept opslaan...',
];

export default function NieuwReceptPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ImportTab>('handmatig');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Import inputs
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');

  // PDF import
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfRecipes, setPdfRecipes] = useState<any[]>([]);
  const [pdfSaving, setPdfSaving] = useState<Set<number>>(new Set());
  const [pdfSaved, setPdfSaved] = useState<Set<number>>(new Set());
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleExtractAndSave = async () => {
    setExtracting(true);
    setExtractError(null);
    setProgressStep(0);

    // Animate progress steps while waiting
    const interval = setInterval(() => {
      setProgressStep((prev) => (prev < PROGRESS_STEPS.length - 2 ? prev + 1 : prev));
    }, 3000);

    try {
      console.log('[URL Import] 1. Starting extract for:', importUrl);
      const res = await fetch('/api/extract/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });

      clearInterval(interval);
      console.log('[URL Import] 2. Extract response status:', res.status);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Extractie mislukt');
      }

      const extracted = await res.json();
      console.log('[URL Import] 3. Extracted data keys:', Object.keys(extracted));

      // Show saving step
      setProgressStep(PROGRESS_STEPS.length - 1);
      setSaving(true);

      // Map and save directly
      const formData = mapExtractedToFormData(extracted, importUrl);
      console.log('[URL Import] 4. Mapped form data, saving...');

      const saveRes = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      console.log('[URL Import] 5. Save response status:', saveRes.status);

      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || 'Opslaan mislukt');
      }

      const { recipe } = await saveRes.json();
      console.log('[URL Import] 6. Recipe saved, id:', recipe.id, '— navigating...');
      router.push(`/recepten/${recipe.id}`);
      console.log('[URL Import] 7. router.push called');
    } catch (err: any) {
      clearInterval(interval);
      console.error('[URL Import] ERROR:', err.message);
      setExtractError(err.message);
    } finally {
      console.log('[URL Import] 8. Finally block — clearing state');
      setExtracting(false);
      setSaving(false);
    }
  };

  const handleExtractText = async () => {
    setExtracting(true);
    setExtractError(null);
    setProgressStep(0);

    const interval = setInterval(() => {
      setProgressStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 2500);

    try {
      const res = await fetch('/api/extract/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Extractie mislukt');
      }

      const extracted = await res.json();
      setExtractedData(extracted);
      setActiveTab('handmatig');
    } catch (err: any) {
      clearInterval(interval);
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const [pdfProgress, setPdfProgress] = useState('');

  const handleExtractPdf = async () => {
    if (!pdfFile) return;

    setExtracting(true);
    setExtractError(null);
    setPdfRecipes([]);
    setPdfSaved(new Set());
    setPdfProgress('PDF inlezen...');

    try {
      // Step 1: Extract text client-side
      console.log('[PDF Import] Extracting text from:', pdfFile.name);
      const { extractPdfText } = await import('@/lib/pdf-reader');
      const pages = await extractPdfText(pdfFile, (current, total) => {
        setPdfProgress(`Pagina ${current} van ${total} inlezen...`);
      });

      console.log(`[PDF Import] Extracted ${pages.length} pages with text`);

      if (pages.length === 0) {
        throw new Error('Geen tekst gevonden in PDF');
      }

      // Step 2: Send text to API for recipe extraction
      setPdfProgress(`${pages.length} pagina's analyseren met AI...`);
      const res = await fetch('/api/extract/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: pages.map(p => p.text) }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'PDF extractie mislukt');
      }

      const { recipes, total } = await res.json();
      console.log(`[PDF Import] Found ${total} recipes`);
      setPdfRecipes(recipes);
    } catch (err: any) {
      console.error('[PDF Import] Error:', err.message);
      setExtractError(err.message);
    } finally {
      setExtracting(false);
      setPdfProgress('');
    }
  };

  const handleSavePdfRecipe = async (index: number) => {
    const recipe = pdfRecipes[index];
    if (!recipe) return;

    setPdfSaving((prev) => new Set(prev).add(index));

    try {
      const formData = mapExtractedToFormData(recipe);
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Opslaan mislukt' }));
        throw new Error(err.error || 'Opslaan mislukt');
      }

      console.log(`[PDF Import] Saved recipe: ${recipe.title}`);
      setPdfSaved((prev) => new Set(prev).add(index));
    } catch (err: any) {
      console.error(`[PDF Import] Save error for "${recipe.title}":`, err.message);
      setExtractError(err.message);
    } finally {
      setPdfSaving((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleSaveAllPdfRecipes = async () => {
    for (let i = 0; i < pdfRecipes.length; i++) {
      if (!pdfSaved.has(i)) {
        await handleSavePdfRecipe(i);
      }
    }
  };

  const handleSubmit = async (data: RecipeFormData) => {
    console.log('[Manual Save] 1. Posting to /api/recipes...');
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    console.log('[Manual Save] 2. Response status:', res.status);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Opslaan mislukt' }));
      console.error('[Manual Save] ERROR:', err.error);
      throw new Error(err.error || 'Opslaan mislukt');
    }

    const { recipe } = await res.json();
    console.log('[Manual Save] 3. Recipe saved, id:', recipe.id, '— navigating...');
    router.push(`/recepten/${recipe.id}`);
    console.log('[Manual Save] 4. router.push called');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Nieuw recept</h1>

      {/* Tab selector */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {extractError && (
        <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {extractError}
        </div>
      )}

      {/* ── Handmatig ──────────────────────────────── */}
      {activeTab === 'handmatig' && (
        <RecipeForm
          initialData={extractedData}
          onSubmit={handleSubmit}
        />
      )}

      {/* ── URL import ─────────────────────────────── */}
      {activeTab === 'url' && (
        <div className="space-y-4 rounded-xl border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            Importeer van URL
          </h2>
          <p className="text-sm text-text-secondary">
            Plak de link naar een recept en wij halen de gegevens automatisch op en slaan het direct voor je op.
          </p>
          <Input
            label="Recept URL"
            type="url"
            placeholder="https://www.hellofresh.nl/recipes/..."
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            disabled={extracting}
          />

          {/* Progress indicator */}
          {extracting && (
            <div className="space-y-3 rounded-lg bg-primary/5 p-4">
              {PROGRESS_STEPS.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
                    idx <= progressStep ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  {idx < progressStep ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs">
                      ✓
                    </span>
                  ) : idx === progressStep ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-400">
                      {idx + 1}
                    </span>
                  )}
                  <span className={idx <= progressStep ? 'text-text-primary font-medium' : 'text-text-muted'}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="primary"
            loading={extracting}
            onClick={handleExtractAndSave}
            disabled={!importUrl.trim() || extracting}
          >
            {extracting ? 'Bezig...' : 'Importeer & opslaan'}
          </Button>
        </div>
      )}

      {/* ── Tekst import ───────────────────────────── */}
      {activeTab === 'tekst' && (
        <div className="space-y-4 rounded-xl border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            Plak recepttekst
          </h2>
          <p className="text-sm text-text-secondary">
            Plak de volledige recepttekst hieronder en wij structureren het voor je.
          </p>
          <textarea
            className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={10}
            placeholder="Plak hier je recepttekst..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            disabled={extracting}
          />

          {/* Progress indicator for text */}
          {extracting && (
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-4 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium text-text-primary">
                {PROGRESS_STEPS[Math.min(progressStep, 3)]}
              </span>
            </div>
          )}

          <Button
            variant="primary"
            loading={extracting}
            onClick={handleExtractText}
            disabled={!importText.trim() || extracting}
          >
            Extracteer
          </Button>
        </div>
      )}

      {/* ── Foto import ────────────────────────────── */}
      {activeTab === 'foto' && (
        <div className="space-y-4 rounded-xl border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            Importeer van foto
          </h2>
          <p className="text-sm text-text-secondary">
            Upload een foto van een recept en wij herkennen de tekst automatisch.
          </p>
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
          />
          <Button variant="primary" disabled>
            Extracteer (binnenkort beschikbaar)
          </Button>
        </div>
      )}

      {/* ── PDF import ─────────────────────────────── */}
      {activeTab === 'pdf' && (
        <div className="space-y-4 rounded-xl border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            Importeer van PDF
          </h2>
          <p className="text-sm text-text-secondary">
            Upload een PDF met recepten. We herkennen automatisch alle recepten in het bestand.
          </p>
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => {
              setPdfFile(e.target.files?.[0] ?? null);
              setPdfRecipes([]);
              setPdfSaved(new Set());
            }}
            className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
            disabled={extracting}
          />

          {pdfFile && (
            <p className="text-xs text-text-muted">
              {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}

          {/* Progress */}
          {extracting && (
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-4 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium text-text-primary">
                {pdfProgress || 'Bezig...'}
              </span>
            </div>
          )}

          {!extracting && pdfRecipes.length === 0 && (
            <Button
              variant="primary"
              loading={extracting}
              onClick={handleExtractPdf}
              disabled={!pdfFile || extracting}
            >
              Recepten herkennen
            </Button>
          )}

          {/* Results */}
          {pdfRecipes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">
                  {pdfRecipes.length} recepten gevonden
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {pdfSaved.size}/{pdfRecipes.length} opgeslagen
                  </span>
                  {pdfSaved.size < pdfRecipes.length && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveAllPdfRecipes}
                      disabled={pdfSaving.size > 0}
                    >
                      Alles opslaan
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-96 space-y-2 overflow-y-auto">
                {pdfRecipes.map((recipe, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {recipe.title}
                      </p>
                      <p className="text-xs text-text-muted">
                        {recipe.ingredients?.length ?? 0} ingrediënten · {recipe.steps?.length ?? 0} stappen
                        {recipe.tijd && ` · ${recipe.tijd}`}
                      </p>
                    </div>
                    {pdfSaved.has(idx) ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <Check className="h-4 w-4" /> Opgeslagen
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={pdfSaving.has(idx)}
                        onClick={() => handleSavePdfRecipe(idx)}
                        disabled={pdfSaving.size > 0}
                      >
                        Opslaan
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
