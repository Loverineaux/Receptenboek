'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link as LinkIcon, Camera, FileUp, PenLine, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import BronInput from '@/components/ui/BronInput';
import RecipeForm, { RecipeFormData } from '@/components/recipes/RecipeForm';
import type { Source, Difficulty } from '@/types';

type ImportTab = 'url' | 'foto' | 'pdf' | 'handmatig';

const tabs: { key: ImportTab; label: string; icon: React.ReactNode }[] = [
  { key: 'url', label: 'URL', icon: <LinkIcon className="h-4 w-4" /> },
  { key: 'foto', label: 'Foto', icon: <Camera className="h-4 w-4" /> },
  { key: 'pdf', label: 'PDF', icon: <FileUp className="h-4 w-4" /> },
  { key: 'handmatig', label: 'Handmatig', icon: <PenLine className="h-4 w-4" /> },
];

// Normalize source names so synonyms map to the same bron
const BRON_SYNONYMS: Record<string, string> = {
  'barbecue': 'BBQ',
  'barbeque': 'BBQ',
  'bbq': 'BBQ',
  'hellofresh nl': 'HelloFresh',
  'hellofresh be': 'HelloFresh',
  'hello fresh': 'HelloFresh',
  'ah': 'Albert Heijn',
  'allerhande': 'Albert Heijn',
  'albert heijn belgie': 'Albert Heijn',
  'albert heijn België': 'Albert Heijn',
  'broodje dunner ebook': 'Broodje Dunner',
  'broodje dunner e-book': 'Broodje Dunner',
};

function mapSource(bron?: string): Source {
  if (!bron || !bron.trim()) return 'Eigen recept';
  const trimmed = bron.trim();
  const lower = trimmed.toLowerCase();
  // Check exact synonym match
  if (BRON_SYNONYMS[lower]) return BRON_SYNONYMS[lower];
  // Check partial match
  for (const [key, value] of Object.entries(BRON_SYNONYMS)) {
    if (lower.includes(key) || key.includes(lower)) return value;
  }
  return trimmed;
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
      .map((i: any) => {
        let hoeveelheid = i.hoeveelheid ? String(i.hoeveelheid) : '';
        let eenheid = i.eenheid || '';
        let naam = i.naam?.trim() || '';

        // If AI put everything in naam (e.g. "200 gram kipfilet"), try to split
        if (!hoeveelheid && naam) {
          // Amount at start: "200 gram kipfilet" or "2 uien" or "halve ui"
          const m = naam.match(
            /^([\d½¼¾⅓⅔,./]+)\s*(gram|g|kg|ml|l|dl|cl|el|tl|eetlepel|theelepel|stuks?|plakjes?|sneetjes?|teentjes?|takjes?|handjes?|bosjes?|snufje|scheut|blikjes?|zakjes?|potjes?|stuk)?\s+(.+)$/i
          );
          if (m) {
            hoeveelheid = m[1];
            eenheid = m[2] || '';
            naam = m[3];
          } else {
            // Dutch words: "halve ui", "kwart paprika"
            const dm = naam.match(/^(halve|half|kwart|driekwart|hele|heel)\s+(.+)$/i);
            if (dm) {
              hoeveelheid = dm[1].toLowerCase();
              naam = dm[2];
            }
          }
        }

        // Amount at end: "kipfilet 200 gram"
        if (!hoeveelheid && naam) {
          const em = naam.match(
            /^(.+?)\s+([\d½¼¾⅓⅔,./]+)\s*(gram|g|kg|ml|l|dl|cl|el|tl|eetlepel|theelepel|stuks?|plakjes?|sneetjes?|teentjes?|takjes?|handjes?|bosjes?|snufje|scheut|blikjes?|zakjes?|potjes?|stuk)?\s*$/i
          );
          if (em) {
            naam = em[1];
            hoeveelheid = em[2];
            eenheid = em[3] || '';
          }
        }

        return { hoeveelheid, eenheid, naam };
      }),
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
    tags: [...new Set([...(extracted.tags ?? []), ...(extracted.categorieen ?? [])])],
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

  const [activeTab, setActiveTab] = useState<ImportTab>('url');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [saving, setSaving] = useState(false);


  // Import inputs
  const [importUrl, setImportUrl] = useState('');

  // Foto import
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoBron, setPhotoBron] = useState('');
  const [dishPhoto, setDishPhoto] = useState<File | null>(null);
  const [dishPhotoPreview, setDishPhotoPreview] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const dishPhotoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const combined = [...photoFiles, ...newFiles].slice(0, 10); // max 10
    setPhotoFiles(combined);
    // Generate previews
    const previews = combined.map(f => URL.createObjectURL(f));
    setPhotoPreviews(prev => {
      prev.forEach(u => URL.revokeObjectURL(u));
      return previews;
    });
  };

  const removePhoto = (index: number) => {
    const newFiles = photoFiles.filter((_, i) => i !== index);
    setPhotoFiles(newFiles);
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const [photoProgress, setPhotoProgress] = useState('');

  const handleExtractPhotos = async () => {
    if (photoFiles.length === 0) return;

    setExtracting(true);
    setExtractError(null);
    setPhotoProgress('Foto\'s voorbereiden...');

    try {
      // Convert files to base64
      const images = await Promise.all(
        photoFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return { data: btoa(binary), media_type: file.type };
        })
      );

      setPhotoProgress('Foto\'s uploaden naar AI...');

      const res = await fetch('/api/extract/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, bron: photoBron.trim() || undefined }),
      });

      if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const err = await res.json();
        throw new Error(err.error || 'Foto extractie mislukt');
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let extracted: any = null;

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
              setPhotoProgress(event.message);
            } else if (event.type === 'done') {
              extracted = event.recipe;
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      if (!extracted) throw new Error('Geen recept geëxtraheerd');

      // Upload the separate dish photo if provided
      if (dishPhoto) {
        setPhotoProgress('Gerecht-foto uploaden...');
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const ext = dishPhoto.name.split('.').pop() || 'jpg';
          const path = `recipes/photo-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('recipe-images')
            .upload(path, dishPhoto, { contentType: dishPhoto.type, upsert: true });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
            extracted.image_url = urlData.publicUrl;
          }
        } catch (imgErr: any) {
          console.warn('[Photo Import] Dish photo upload failed:', imgErr.message);
        }
      }

      // Save with duplicate check
      setPhotoProgress('Recept opslaan...');
      const formData = mapExtractedToFormData(extracted);
      const recipe = await saveRecipe(formData);
      if (recipe) router.push(`/recepten/${recipe.id}`);
    } catch (err: any) {
      console.error('[Photo Import] Error:', err.message);
      setExtractError(err.message);
    } finally {
      setExtracting(false);
      setPhotoProgress('');
    }
  };

  // PDF import
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBron, setPdfBron] = useState('');
  const [pdfRecipes, setPdfRecipes] = useState<any[]>([]);
  const [pdfSaving, setPdfSaving] = useState<Set<number>>(new Set());
  const [pdfSaved, setPdfSaved] = useState<Set<number>>(new Set());
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Prevent navigation while extracting/saving
  const isBusy = extracting || saving || pdfSaving.size > 0;

  useEffect(() => {
    if (!isBusy) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (anchor && anchor.href && !anchor.href.includes('/recepten/nieuw')) {
        e.preventDefault();
        e.stopPropagation();
        alert('Er wordt nog een recept verwerkt. Wacht tot het klaar is.');
      }
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      alert('Er wordt nog een recept verwerkt. Wacht tot het klaar is.');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isBusy]);

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

      // Map and save with duplicate check
      const formData = mapExtractedToFormData(extracted, importUrl);
      const recipe = await saveRecipe(formData);
      if (recipe) router.push(`/recepten/${recipe.id}`);
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

  const [pdfProgress, setPdfProgress] = useState('');

  const handleExtractPdf = async () => {
    if (!pdfFile) return;

    setExtracting(true);
    setExtractError(null);
    setPdfRecipes([]);
    setPdfSaved(new Set());
    setPdfProgress('PDF inlezen...');

    try {
      // Upload PDF directly to API — Python handles extraction
      console.log('[PDF Import] Uploading:', pdfFile.name);
      setPdfProgress('PDF uploaden en analyseren...');

      const formData = new FormData();
      formData.append('pdf', pdfFile);

      const res = await fetch('/api/extract/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const err = await res.json();
        throw new Error(err.error || 'PDF extractie mislukt');
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const foundRecipes: any[] = [];

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
              setPdfProgress(event.message);
            } else if (event.type === 'batch_done') {
              foundRecipes.push(...event.recipes);
              setPdfRecipes([...foundRecipes]);
              setPdfProgress(`Batch ${event.completed}/${event.total_batches} klaar — ${foundRecipes.length} recepten gevonden`);
            } else if (event.type === 'batch_error') {
              setPdfProgress(`Batch ${event.batch} mislukt, doorgaan...`);
            } else if (event.type === 'done') {
              console.log(`[PDF Import] Done: ${event.total} recipes`);
              setPdfRecipes(event.recipes);
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (parseErr: any) {
            if (parseErr.message !== event?.error) continue;
            throw parseErr;
          }
        }
      }
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
      let imageUrl = recipe.image_url || '';

      // Upload image_data (base64 from PDF) to Supabase Storage if present
      if (recipe.image_data && !imageUrl) {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const blob = await fetch(recipe.image_data).then(r => r.blob());
          const path = `recipes/${Date.now()}-${index}.jpg`;
          const { error: upErr } = await supabase.storage
            .from('recipe-images')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
            imageUrl = urlData.publicUrl;
          }
        } catch (imgErr: any) {
          console.warn('[PDF Import] Image upload failed:', imgErr.message);
        }
      }

      // Override bron if user specified one
      const recipeWithOverrides = {
        ...recipe,
        image_url: imageUrl,
        bron: pdfBron.trim() || recipe.bron,
      };
      const formData = mapExtractedToFormData(recipeWithOverrides);
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
    // All saved — redirect to recipes
    router.push('/recepten');
  };

  /** Save recipe with duplicate detection. Returns recipe or null if user cancelled. */
  const saveRecipe = async (data: any, force = false): Promise<any> => {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(force ? { ...data, _force: true } : data),
    });

    if (res.status === 409) {
      const { message } = await res.json();
      const proceed = window.confirm(`${message}\n\nWil je het toch opslaan?`);
      if (proceed) return saveRecipe(data, true);
      return null;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Opslaan mislukt' }));
      throw new Error(err.error || 'Opslaan mislukt');
    }

    return (await res.json()).recipe;
  };

  const handleSubmit = async (data: RecipeFormData) => {
    const recipe = await saveRecipe(data);
    if (recipe) router.push(`/recepten/${recipe.id}`);
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

      {/* Busy banner */}
      {isBusy && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Recept wordt verwerkt — navigeer niet weg van deze pagina.</span>
        </div>
      )}

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

      {/* ── Foto import ────────────────────────────── */}
      {activeTab === 'foto' && (
        <div className="space-y-4 rounded-xl border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">
            Importeer van foto
          </h2>
          <p className="text-sm text-text-secondary">
            Upload foto's van een recept. Meerdere foto's mogen (bijv. ingrediënten + bereiding + resultaat). We combineren alles tot één recept.
          </p>

          <BronInput
            value={photoBron}
            onChange={setPhotoBron}
            disabled={extracting}
          />

          {/* Drop zone */}
          <div
            className="relative flex min-h-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-primary hover:bg-primary/5"
            onClick={() => photoInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); handlePhotoSelect(e.dataTransfer.files); }}
          >
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-2 text-sm text-text-secondary">
                Klik of sleep foto's hierheen
              </p>
              <p className="text-xs text-text-muted">Max 10 foto's, JPEG/PNG/WebP</p>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoSelect(e.target.files)}
              disabled={extracting}
            />
          </div>

          {/* Photo previews */}
          {photoPreviews.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {photoPreviews.map((preview, idx) => (
                <div key={idx} className="group relative h-24 w-24 overflow-hidden rounded-lg border">
                  <img src={preview} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    &times;
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Separate dish photo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Foto van het gerecht (optioneel)
            </label>
            <p className="mb-2 text-xs text-text-muted">
              Upload een aparte foto van het eindresultaat. Deze wordt als afbeelding bij het recept gebruikt.
            </p>
            <div className="flex items-center gap-3">
              {dishPhotoPreview ? (
                <div className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                  <img src={dishPhotoPreview} alt="Gerecht" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(dishPhotoPreview);
                      setDishPhoto(null);
                      setDishPhotoPreview('');
                    }}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => dishPhotoInputRef.current?.click()}
                  className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-text-muted transition-colors hover:border-primary hover:text-primary"
                  disabled={extracting}
                >
                  <Camera className="h-6 w-6" />
                </button>
              )}
              <input
                ref={dishPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDishPhoto(file);
                    setDishPhotoPreview(URL.createObjectURL(file));
                  }
                }}
                disabled={extracting}
              />
            </div>
          </div>

          {/* Progress indicator */}
          {extracting && (
            <div className="space-y-2 rounded-lg bg-primary/5 p-4">
              <div className="flex items-center gap-3 text-sm">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium text-text-primary">
                  {photoProgress || 'Bezig...'}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: photoProgress.includes('opslaan') ? '90%' : photoProgress.includes('extraheren') ? '75%' : photoProgress.includes('gevonden') ? '60%' : photoProgress.includes('herkennen') ? '40%' : photoProgress.includes('uploaden') ? '20%' : '10%' }}
                />
              </div>
            </div>
          )}

          <Button
            variant="primary"
            loading={extracting}
            onClick={handleExtractPhotos}
            disabled={photoFiles.length === 0 || extracting}
          >
            {extracting ? 'Bezig...' : `Recept extraheren${photoFiles.length > 0 ? ` (${photoFiles.length} foto${photoFiles.length > 1 ? "'s" : ''})` : ''}`}
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

          <BronInput
            value={pdfBron}
            onChange={setPdfBron}
            disabled={extracting}
          />

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
