'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link as LinkIcon, Camera, FileUp, PenLine, Loader2, Check, X, AlertTriangle, List } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import BronInput from '@/components/ui/BronInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RecipeForm, { RecipeFormData } from '@/components/recipes/RecipeForm';
import type { Source, Difficulty } from '@/types';

type ImportTab = 'url' | 'foto' | 'pdf' | 'handmatig' | 'preview';

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

/** Parse a single ingredient — split hoeveelheid/eenheid/naam correctly */
function parseIngredient(i: any): { hoeveelheid: string; eenheid: string; naam: string } {
  let hoeveelheid = i.hoeveelheid ? String(i.hoeveelheid) : '';
  let eenheid = i.eenheid || '';
  let naam = i.naam?.trim() || '';

  // If AI put everything in naam (e.g. "200 gram kipfilet"), try to split
  if (!hoeveelheid && naam) {
    const m = naam.match(
      /^([\d½¼¾⅓⅔,./]+)\s*(gram|g|kg|ml|l|dl|cl|el|tl|eetlepel|eetlepels|theelepel|theelepels|stuks?|plakjes?|sneetjes?|teentjes?|takjes?|handjes?|bosjes?|snufje|scheut|blikjes?|zakjes?|potjes?|stuk)?\s+(.+)$/i
    );
    if (m) {
      hoeveelheid = m[1];
      eenheid = m[2] || '';
      naam = m[3];
    } else {
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
      /^(.+?)\s+([\d½¼¾⅓⅔,./]+)\s*(gram|g|kg|ml|l|dl|cl|el|tl|eetlepel|eetlepels|theelepel|theelepels|stuks?|plakjes?|sneetjes?|teentjes?|takjes?|handjes?|bosjes?|snufje|scheut|blikjes?|zakjes?|potjes?|stuk)?\s*$/i
    );
    if (em) {
      naam = em[1];
      hoeveelheid = em[2];
      eenheid = em[3] || '';
    }
  }

  // Eenheid zit in naam: hoeveelheid="600", naam="gram kippendijen"
  if (hoeveelheid && !eenheid && naam) {
    const um = naam.match(
      /^(gram|g|kg|ml|l|dl|cl|el|tl|eetlepel|eetlepels|theelepel|theelepels|stuks?|plakjes?|sneetjes?|teentjes?|takjes?|handjes?|bosjes?|snufje|scheut|blikjes?|zakjes?|potjes?|stuk|stokje|stokjes)\s+(.+)$/i
    );
    if (um) {
      eenheid = um[1];
      naam = um[2];
    }
  }

  // "2 eetlepels sojasaus" in naam
  if (!hoeveelheid && naam) {
    const nm = naam.match(/^([\d½¼¾⅓⅔,./]+)\s+(eetlepels?|theelepels?|el|tl|teentjes?|handjes?|takjes?|plakjes?|sneetjes?|bosjes?)\s+(.+)$/i);
    if (nm) {
      hoeveelheid = nm[1];
      eenheid = nm[2];
      naam = nm[3];
    }
  }

  // Countable items without unit → "stuks"
  if (hoeveelheid && !eenheid && naam) {
    const countable = /^(ui|uien|ei|eieren|tomaat|tomaten|paprika|paprika's|aardappel|aardappelen|wortel|wortelen|citroen|citroenen|limoen|limoenen|avocado|avocado's|banaan|bananen|appel|appels|peer|peren|mango|mango's|courgette|courgettes|aubergine|aubergines|komkommer|komkommers|wrap|wraps|broodje|broodjes|tortilla|tortilla's|peper|pepers|champignon|champignons|kaneelstokje|kaneelstokjes|kruidnagel|kruidnagels|laurierblad|laurierbladeren)\s*(\(.*\))?$/i;
    if (countable.test(naam.trim())) {
      eenheid = 'stuks';
    }
  }

  // Handle "5x 80 gram" or "5 x 80 gram" patterns → calculate total
  if (hoeveelheid && /^\d+\s*x\s*\d+/.test(hoeveelheid)) {
    const m = hoeveelheid.match(/^(\d+)\s*x\s*(\d+)/);
    if (m) {
      const total = parseInt(m[1]) * parseInt(m[2]);
      const origCount = m[1];
      hoeveelheid = String(total);
      if (!naam.includes(origCount)) {
        naam = `${naam} (${origCount} stuks)`;
      }
    }
  }
  // Also handle if it ended up in eenheid: "x80 gram"
  if (eenheid && /^x\s*\d+/.test(eenheid)) {
    const m = eenheid.match(/^x\s*(\d+)\s*(.*)/);
    if (m && hoeveelheid) {
      const total = parseInt(hoeveelheid) * parseInt(m[1]);
      hoeveelheid = String(total);
      eenheid = m[2].trim() || '';
    }
  }

  // Olie etc. without quantity → hide "?"
  const noQtyNeeded = /^(olie|olijfolie|zonnebloemolie|boter|peper|zout|peper en zout|peper & zout|naar smaak|water|bakvet|roomboter|sesamolie)/i;
  if (!hoeveelheid && noQtyNeeded.test(naam)) {
    hoeveelheid = '';
  }

  return { hoeveelheid, eenheid, naam };
}

/** Parse all ingredients from extracted data */
function parseExtractedIngredients(ingredients: any[]): { hoeveelheid: string; eenheid: string; naam: string }[] {
  return (ingredients || [])
    .filter((i: any) => i.naam)
    .map(parseIngredient);
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
    ingredients: parseExtractedIngredients(extracted.ingredients),
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
  'Website ophalen...',
  'Pagina scrapen met browser...',
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
  const [extractedPreview, setExtractedPreview] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [navBlockToast, setNavBlockToast] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; resolve: (v: boolean) => void } | null>(null);

  const showConfirm = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ title, message, resolve });
    });
  };


  // Import inputs
  const [importUrl, setImportUrl] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkItems, setBulkItems] = useState<{ url: string; title: string; status: 'pending' | 'extracting' | 'saving' | 'done' | 'error' | 'duplicate'; error?: string; recipeId?: string }[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);

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

      // Show preview
      // Add basic validation for photo imports (no server-side validation)
      const ings = extracted.ingredients || [];
      const missingQty = ings.filter((i: any) => !i.hoeveelheid).length;
      extracted._validation = {
        score: Math.max(0, 100 - (missingQty > ings.length / 2 ? 25 : 0) - (!extracted.image_url ? 10 : 0) - (!(extracted.steps?.length) ? 25 : 0) - (!extracted.basis_porties ? 10 : 0)),
        issues: [
          ...(!extracted.image_url ? [{ severity: 'warning', message: 'Geen afbeelding — voeg een gerecht-foto toe' }] : []),
          ...(missingQty === ings.length && ings.length > 0 ? [{ severity: 'error', message: 'Geen hoeveelheden bij ingrediënten' }] : []),
          ...(missingQty > 0 && missingQty < ings.length ? [{ severity: 'warning', message: `${missingQty} ingrediënten missen een hoeveelheid` }] : []),
          ...(!extracted.steps?.length ? [{ severity: 'error', message: 'Geen bereidingsstappen' }] : []),
          ...(!extracted.basis_porties ? [{ severity: 'warning', message: 'Aantal porties onbekend' }] : []),
        ].filter(Boolean),
      };
      setExtractedPreview(extracted);
      setActiveTab('preview');
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
        setNavBlockToast(true); setTimeout(() => setNavBlockToast(false), 3000);
      }
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setNavBlockToast(true);
      setTimeout(() => setNavBlockToast(false), 3000);
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

      // Parse ingredients and show preview with validation
      extracted.ingredients = parseExtractedIngredients(extracted.ingredients);
      setExtractedPreview(extracted);
      setActiveTab('preview');
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

  // ── Bulk URL import ───────────────────────────
  const parseBulkUrls = () => {
    const lines = bulkText.split('\n');
    const parsed: { url: string; title: string }[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const m = line.match(/(https?:\/\/[^\s]+)/);
      if (!m) continue;
      const url = m[1];
      if (seen.has(url)) continue;
      seen.add(url);

      // Try to extract a recipe name from the text before the URL
      const before = line.substring(0, m.index).trim();
      let title = '';
      // Strip common prefixes like "Ik eet vandaag:" and hashtags
      if (before) {
        title = before
          .replace(/^ik eet vandaag:\s*/i, '')
          .replace(/#\w+/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      if (!title) {
        // Fallback: use URL slug
        const slug = decodeURIComponent(url.split('/').pop() || '').replace(/-/g, ' ');
        title = slug || url;
      }

      parsed.push({ url, title });
    }

    setBulkItems(parsed.map(({ url, title }) => ({ url, title, status: 'pending' })));
  };

  const handleBulkImport = async () => {
    setBulkImporting(true);
    setBulkDone(false);

    for (let i = 0; i < bulkItems.length; i++) {
      if (bulkItems[i].status === 'done' || bulkItems[i].status === 'duplicate') continue;

      setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'extracting' } : it));

      try {
        // Extract
        const extractRes = await fetch('/api/extract/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: bulkItems[i].url }),
        });
        if (!extractRes.ok) {
          const err = await extractRes.json().catch(() => ({ error: 'Extractie mislukt' }));
          throw new Error(err.error || 'Extractie mislukt');
        }
        const extracted = await extractRes.json();
        extracted.ingredients = parseExtractedIngredients(extracted.ingredients);
        const title = extracted.title || bulkItems[i].title;

        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, title, status: 'saving' } : it));

        // Save
        const formData = mapExtractedToFormData(extracted);
        let saveRes = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (saveRes.status === 409) {
          saveRes = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, _force: true }),
          });
          if (saveRes.ok) {
            const { recipe } = await saveRes.json();
            setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, title, status: 'duplicate', recipeId: recipe.id } : it));
            continue;
          }
        }

        if (!saveRes.ok) {
          const err = await saveRes.json().catch(() => ({ error: 'Opslaan mislukt' }));
          throw new Error(err.error || 'Opslaan mislukt');
        }

        const { recipe } = await saveRes.json();
        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, title, status: 'done', recipeId: recipe.id } : it));
      } catch (err: any) {
        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: err.message } : it));
      }

      if (i < bulkItems.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    setBulkImporting(false);
    setBulkDone(true);
  };

  const retryFailedBulk = async () => {
    const failed = bulkItems.map((it, idx) => it.status === 'error' ? idx : -1).filter(i => i >= 0);
    if (!failed.length) return;
    setBulkImporting(true);

    for (const i of failed) {
      setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'extracting', error: undefined } : it));
      try {
        const extractRes = await fetch('/api/extract/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: bulkItems[i].url }),
        });
        if (!extractRes.ok) throw new Error('Extractie mislukt');
        const extracted = await extractRes.json();
        extracted.ingredients = parseExtractedIngredients(extracted.ingredients);
        const title = extracted.title || bulkItems[i].title;

        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, title, status: 'saving' } : it));

        const formData = mapExtractedToFormData(extracted);
        let saveRes = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (saveRes.status === 409) {
          saveRes = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, _force: true }),
          });
        }

        if (!saveRes.ok) throw new Error('Opslaan mislukt');
        const { recipe } = await saveRes.json();
        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, title, status: 'done', recipeId: recipe.id } : it));
      } catch (err: any) {
        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: err.message } : it));
      }
      await new Promise(r => setTimeout(r, 500));
    }
    setBulkImporting(false);
  };

  const bulkCounts = {
    total: bulkItems.length,
    done: bulkItems.filter(i => i.status === 'done' || i.status === 'duplicate').length,
    error: bulkItems.filter(i => i.status === 'error').length,
  };

  const [pdfProgress, setPdfProgress] = useState('');
  const [pdfLogs, setPdfLogs] = useState<string[]>([]);

  const addPdfLog = (msg: string) => {
    setPdfLogs(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);
    setPdfProgress(msg);
  };

  const handleExtractPdf = async () => {
    if (!pdfFile) return;

    setExtracting(true);
    setExtractError(null);
    setPdfRecipes([]);
    setPdfSaved(new Set());
    setPdfLogs([]);
    addPdfLog('PDF inlezen...');

    try {
      addPdfLog('PDF uploaden en analyseren...');
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
              addPdfLog(event.message);
            } else if (event.type === 'batch_done') {
              for (const r of event.recipes) {
                foundRecipes.push(r);
                addPdfLog(`Recept ${foundRecipes.length}: ${r.title}`);
              }
              setPdfRecipes([...foundRecipes]);
            } else if (event.type === 'batch_error') {
              addPdfLog(`Batch ${event.batch} mislukt: ${event.error}`);
            } else if (event.type === 'done') {
              addPdfLog(`Klaar! ${event.total} recepten gevonden`);
              setPdfRecipes(event.recipes);
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
          }
        }
      }
    } catch (err: any) {
      addPdfLog(`Fout: ${err.message}`);
      setExtractError(err.message);
    } finally {
      setExtracting(false);
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
      const proceed = await showConfirm('Dubbel recept', `${message}\n\nWil je het toch opslaan?`);
      if (proceed) return saveRecipe(data, true);
      return null;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Opslaan mislukt' }));
      throw new Error(err.error || 'Opslaan mislukt');
    }

    return (await res.json()).recipe;
  };


  const handleSavePreview = async () => {
    if (!extractedPreview) return;
    setSaving(true);
    try {
      const formData = mapExtractedToFormData(extractedPreview);
      const recipe = await saveRecipe(formData);
      if (recipe) router.push(`/recepten/${recipe.id}`);
    } catch (err: any) {
      setExtractError(err.message);
    } finally {
      setSaving(false);
    }
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

      {/* Tab selector — hidden during preview */}
      {activeTab !== 'preview' && (
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
      )}

      {extractError && (
        <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {extractError}
        </div>
      )}

      {/* ── Preview na extractie ───────────────────── */}
      {activeTab === 'preview' && extractedPreview && (
        <div className="space-y-5 rounded-xl border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Recept controleren</h2>

          {/* Validation issues */}
          {extractedPreview._validation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${
                  extractedPreview._validation.score >= 80 ? 'bg-green-500' :
                  extractedPreview._validation.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium text-text-primary">
                  Kwaliteit: {extractedPreview._validation.score}/100
                </span>
              </div>
              {extractedPreview._validation.issues.map((issue: any, idx: number) => (
                <div
                  key={idx}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    issue.severity === 'error' ? 'bg-red-50 text-red-700' :
                    issue.severity === 'warning' ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-50 text-text-muted'
                  }`}
                >
                  {issue.severity === 'error' ? '!' : issue.severity === 'warning' ? '!' : 'i'} {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Recipe preview */}
          <div className="space-y-4">
            {extractedPreview.image_url && (
              <img src={extractedPreview.image_url} alt="" className="h-48 w-full rounded-lg object-cover" />
            )}

            <div>
              <h3 className="text-xl font-bold text-text-primary">{extractedPreview.title}</h3>
              {extractedPreview.subtitle && (
                <p className="mt-1 text-sm italic text-text-secondary">{extractedPreview.subtitle}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-muted">
                {extractedPreview.bron && <span>Bron: {extractedPreview.bron}</span>}
                {extractedPreview.tijd && <span>Tijd: {extractedPreview.tijd}</span>}
                {extractedPreview.basis_porties && <span>Porties: {extractedPreview.basis_porties}</span>}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-text-primary">
                Ingrediënten ({extractedPreview.ingredients?.length || 0})
              </h4>
              <div className="space-y-1">
                {(extractedPreview.ingredients || []).map((ing: any, idx: number) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <span className="min-w-[4rem] font-medium text-text-primary">
                      {ing.hoeveelheid || ''}
                    </span>
                    <span className="min-w-[4rem] text-text-secondary">{ing.eenheid || ''}</span>
                    <span className="text-text-primary">{ing.naam}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-text-primary">
                Bereiding ({extractedPreview.steps?.length || 0} stappen)
              </h4>
              <ol className="space-y-2">
                {(extractedPreview.steps || []).map((step: any, idx: number) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="shrink-0 font-medium text-primary">{idx + 1}.</span>
                    <span className="text-text-secondary">{step.beschrijving}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Nutrition */}
            {extractedPreview.nutrition && Object.values(extractedPreview.nutrition).some(Boolean) && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-text-primary">Voedingswaarden</h4>
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  {extractedPreview.nutrition.energie_kcal && <span>{extractedPreview.nutrition.energie_kcal} kcal</span>}
                  {extractedPreview.nutrition.eiwitten && <span>{extractedPreview.nutrition.eiwitten}g eiwit</span>}
                  {extractedPreview.nutrition.koolhydraten && <span>{extractedPreview.nutrition.koolhydraten}g koolh.</span>}
                  {extractedPreview.nutrition.vetten && <span>{extractedPreview.nutrition.vetten}g vet</span>}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t pt-4">
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSavePreview}
            >
              Recept opslaan
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setExtractedPreview(null);
                setActiveTab('url');
              }}
            >
              Annuleren
            </Button>
          </div>
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Importeer van URL
            </h2>
            <button
              type="button"
              onClick={() => { setBulkMode(!bulkMode); setExtractError(null); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                bulkMode
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
              }`}
              disabled={extracting || bulkImporting}
            >
              <List className="h-3.5 w-3.5" />
              Bulk import
            </button>
          </div>

          {!bulkMode ? (
            <>
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
            </>
          ) : (
            /* ── Bulk URL import ─────────────────────────── */
            <div className="space-y-4">
              {bulkItems.length === 0 ? (
                <>
                  <p className="text-sm text-text-secondary">
                    Plak meerdere URLs hieronder (een per regel, of tekst met URLs erin). De URLs worden automatisch herkend.
                  </p>
                  <textarea
                    className="w-full rounded-lg border border-border bg-surface p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={10}
                    placeholder={"https://www.ah.nl/r/660056\nhttps://www.ah.nl/r/1200299\nhttps://www.hellofresh.nl/recipes/..."}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <Button onClick={parseBulkUrls} disabled={!bulkText.trim()}>
                    URLs herkennen
                  </Button>
                </>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="rounded-lg bg-primary/5 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-text-secondary">
                        {bulkImporting ? 'Importeren...' : bulkDone ? 'Import voltooid' : `${bulkCounts.total} recepten gevonden`}
                      </span>
                      <span className="font-medium text-text-primary">
                        {bulkCounts.done}/{bulkCounts.total}
                        {bulkCounts.error > 0 && <span className="ml-2 text-red-500">({bulkCounts.error} mislukt)</span>}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${bulkCounts.total > 0 ? (bulkCounts.done / bulkCounts.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {!bulkImporting && !bulkDone && (
                      <Button onClick={handleBulkImport}>
                        Alles importeren ({bulkCounts.total})
                      </Button>
                    )}
                    {!bulkImporting && bulkCounts.error > 0 && (
                      <Button variant="secondary" onClick={retryFailedBulk}>
                        Mislukte opnieuw ({bulkCounts.error})
                      </Button>
                    )}
                    {bulkDone && (
                      <Button onClick={() => router.push('/recepten')}>
                        Naar recepten
                      </Button>
                    )}
                    {!bulkImporting && (
                      <Button variant="ghost" onClick={() => { setBulkItems([]); setBulkDone(false); }}>
                        Terug
                      </Button>
                    )}
                  </div>

                  {/* Recipe list */}
                  <div className="max-h-[400px] space-y-1 overflow-y-auto">
                    {bulkItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                          item.status === 'done' ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' :
                          item.status === 'duplicate' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950' :
                          item.status === 'error' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' :
                          item.status === 'extracting' || item.status === 'saving' ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950' :
                          'border-border bg-surface'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {item.status === 'done' && <Check className="h-4 w-4 text-green-600" />}
                          {item.status === 'duplicate' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {item.status === 'error' && <X className="h-4 w-4 text-red-600" />}
                          {(item.status === 'extracting' || item.status === 'saving') && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          )}
                          {item.status === 'pending' && (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-text-primary">
                            {item.title}
                          </div>
                          {item.status === 'extracting' && (
                            <div className="text-xs text-blue-600">Recept ophalen...</div>
                          )}
                          {item.status === 'saving' && (
                            <div className="text-xs text-blue-600">Opslaan...</div>
                          )}
                          {item.status === 'error' && (
                            <div className="text-xs text-red-600">{item.error}</div>
                          )}
                          {item.status === 'duplicate' && (
                            <div className="text-xs text-yellow-600">Bestond al, toch opgeslagen</div>
                          )}
                        </div>
                        {item.recipeId && (
                          <a
                            href={`/recepten/${item.recipeId}`}
                            className="flex-shrink-0 text-xs text-primary hover:underline"
                            target="_blank"
                          >
                            Bekijk
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
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

          {/* Progress logs */}
          {(extracting || pdfLogs.length > 0) && (
            <div className="rounded-xl border bg-surface p-4 space-y-3">
              {extracting && (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium text-text-primary">{pdfProgress || 'Bezig...'}</span>
                </div>
              )}

              {pdfLogs.length > 0 && (
                <div className="space-y-1.5">
                  {pdfLogs.map((line, i) => {
                    const msg = line.split(' — ')[1] || line;
                    const isDone = msg.includes('Klaar') || msg.includes('Recept ');
                    const isError = msg.includes('mislukt') || msg.includes('Fout');
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {isDone ? (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-white">✓</span>
                        ) : isError ? (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">!</span>
                        ) : i === pdfLogs.length - 1 && extracting ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                        ) : (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] text-gray-500">✓</span>
                        )}
                        <span className={i === pdfLogs.length - 1 && extracting ? 'text-text-primary font-medium' : 'text-text-muted'}>
                          {msg}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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
      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        variant="primary"
        confirmLabel="Ja, opslaan"
        onConfirm={() => { confirmDialog?.resolve(true); setConfirmDialog(null); }}
        onCancel={() => { confirmDialog?.resolve(false); setConfirmDialog(null); }}
      />

      {/* Nav block toast */}
      {navBlockToast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white shadow-lg">
          Er wordt nog een recept verwerkt. Wacht tot het klaar is.
        </div>
      )}
    </div>
  );
}
