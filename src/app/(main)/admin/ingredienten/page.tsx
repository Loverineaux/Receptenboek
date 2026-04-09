'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, X, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
}

export default function AdminIngredientenPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'missing' | 'has'>('all');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch('/api/ingredients?limit=500')
      .then((r) => r.json())
      .then((data) => setIngredients(data.ingredients ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (id: string) => {
    setSaving(true);
    const res = await fetch(`/api/ingredients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: editUrl || null }),
    });
    if (res.ok) {
      setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, image_url: editUrl || null } : i));
      setEditingId(null);
      showToast('Afbeelding opgeslagen');
    } else {
      showToast('Opslaan mislukt');
    }
    setSaving(false);
  };

  const filtered = ingredients.filter((i) => {
    if (filter === 'missing') return !i.image_url;
    if (filter === 'has') return !!i.image_url;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Ingrediënten ({ingredients.length})</h1>
        <div className="flex gap-1">
          {(['all', 'missing', 'has'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? `Alle (${ingredients.length})` : f === 'missing' ? `Zonder foto (${ingredients.filter(i => !i.image_url).length})` : `Met foto (${ingredients.filter(i => i.image_url).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {filtered.map((ing) => (
          <div key={ing.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-surface px-3 py-2">
            {/* Thumbnail */}
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
              {ing.image_url ? (
                <Image src={ing.image_url} alt="" fill className="object-cover" />
              ) : (
                <ImageIcon className="h-4 w-4 text-text-muted" />
              )}
            </div>

            {/* Name */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">{ing.name}</p>
              {ing.category && <p className="text-[10px] text-text-muted">{ing.category}</p>}
            </div>

            {/* URL edit */}
            {editingId === ing.id ? (
              <div className="flex flex-1 items-center gap-1">
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="Plak afbeeldings-URL..."
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-primary focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(ing.id); if (e.key === 'Escape') setEditingId(null); }}
                />
                <button
                  onClick={() => handleSave(ing.id)}
                  disabled={saving}
                  className="rounded-md p-1 text-primary hover:bg-primary/10"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-md p-1 text-text-muted hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {ing.image_url && (
                  <a href={ing.image_url} target="_blank" rel="noopener" className="rounded-md p-1 text-text-muted hover:bg-gray-100" title="Open afbeelding">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => { setEditingId(ing.id); setEditUrl(ing.image_url || ''); }}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                    ing.image_url
                      ? 'text-text-muted hover:bg-gray-100'
                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  }`}
                >
                  {ing.image_url ? 'Wijzig' : 'Voeg foto toe'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
