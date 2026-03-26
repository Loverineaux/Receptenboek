'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Link as LinkIcon, Camera, FileUp, PenLine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import RecipeForm, { RecipeFormData } from '@/components/recipes/RecipeForm';
import type { ExtractedRecipe } from '@/types';

type ImportTab = 'handmatig' | 'url' | 'tekst' | 'foto' | 'pdf';

const tabs: { key: ImportTab; label: string; icon: React.ReactNode }[] = [
  { key: 'handmatig', label: 'Handmatig', icon: <PenLine className="h-4 w-4" /> },
  { key: 'url', label: 'URL', icon: <LinkIcon className="h-4 w-4" /> },
  { key: 'tekst', label: 'Tekst', icon: <FileText className="h-4 w-4" /> },
  { key: 'foto', label: 'Foto', icon: <Camera className="h-4 w-4" /> },
  { key: 'pdf', label: 'PDF', icon: <FileUp className="h-4 w-4" /> },
];

export default function NieuwReceptPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<ImportTab>('handmatig');
  const [extractedData, setExtractedData] = useState<ExtractedRecipe | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Import inputs
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');

  const handleExtract = async (type: 'url' | 'tekst' | 'foto' | 'pdf') => {
    setExtracting(true);
    setExtractError(null);

    try {
      const payload: Record<string, string> = { type };
      if (type === 'url') payload.url = importUrl;
      if (type === 'tekst') payload.text = importText;

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Extractie mislukt');
      }

      const data = await res.json();
      setExtractedData(data.recipe);
      setActiveTab('handmatig'); // Show form with pre-filled data
    } catch (err: any) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (data: RecipeFormData) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const { recipe } = await res.json();
      router.push(`/recepten/${recipe.id}`);
    }
  };

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
            Plak de link naar een recept en wij halen de gegevens automatisch op.
          </p>
          <Input
            label="Recept URL"
            type="url"
            placeholder="https://www.hellofresh.nl/recipes/..."
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
          />
          <Button
            variant="primary"
            loading={extracting}
            onClick={() => handleExtract('url')}
            disabled={!importUrl.trim()}
          >
            Extracteer
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
          />
          <Button
            variant="primary"
            loading={extracting}
            onClick={() => handleExtract('tekst')}
            disabled={!importText.trim()}
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
            Upload een PDF met een recept en wij lezen het automatisch uit.
          </p>
          <input
            type="file"
            accept=".pdf"
            className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
          />
          <Button variant="primary" disabled>
            Extracteer (binnenkort beschikbaar)
          </Button>
        </div>
      )}
    </div>
  );
}
