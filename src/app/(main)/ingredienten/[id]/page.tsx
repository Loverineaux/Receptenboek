'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Sparkles, Loader2, Pencil, X, Check, Camera, Search } from 'lucide-react';
import ProductCard from '@/components/ingredients/ProductCard';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/client';
import type { GenericIngredientWithProducts, GenericIngredient } from '@/types';

// ── Category emoji mapping (same as IngredientCard) ──

const CATEGORY_EMOJI: Record<string, string> = {
  groente: '🥬',
  fruit: '🍎',
  vlees: '🥩',
  vis: '🐟',
  zuivel: '🧀',
  granen: '🌾',
  kruiden: '🌿',
  overig: '🫙',
};

// ── Nutrition row helper ──

function NutritionRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-1.5 text-sm text-text-muted">{label}</td>
      <td className="py-1.5 text-right text-sm font-medium text-text-primary">
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        {unit}
      </td>
    </tr>
  );
}

// ── Encyclopedie block helper ──

function InfoBlock({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h3>
      <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">{content}</p>
    </div>
  );
}

// ── Main page component ──

export default function IngredientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin: isAdminUser } = useAdmin();

  const [ingredient, setIngredient] = useState<GenericIngredientWithProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer product state
  const [transferProductId, setTransferProductId] = useState<string | null>(null);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferResults, setTransferResults] = useState<GenericIngredient[]>([]);
  const [transferring, setTransferring] = useState(false);
  const supabaseClient = createClient();

  // Generate-content state
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState('');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', name_plural: '', category: '', aliases: '',
    gram_per_piece: '', gram_per_el: '', gram_per_tl: '',
    image_url: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const startEditing = () => {
    if (!ingredient) return;
    setEditForm({
      name: ingredient.name,
      name_plural: ingredient.name_plural || '',
      category: ingredient.category || '',
      aliases: ingredient.aliases.join(', '),
      gram_per_piece: ingredient.gram_per_piece?.toString() || '',
      gram_per_el: ingredient.gram_per_el?.toString() || '',
      gram_per_tl: ingredient.gram_per_tl?.toString() || '',
      image_url: ingredient.image_url || '',
    });
    setImagePreview(ingredient.image_url || null);
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!ingredient) return;
    setSaving(true);
    try {
      const updates = {
        name: editForm.name.trim(),
        name_plural: editForm.name_plural.trim() || null,
        category: editForm.category.trim() || null,
        aliases: editForm.aliases.split(',').map(a => a.trim()).filter(Boolean),
        gram_per_piece: editForm.gram_per_piece ? parseFloat(editForm.gram_per_piece) : null,
        gram_per_el: editForm.gram_per_el ? parseFloat(editForm.gram_per_el) : null,
        gram_per_tl: editForm.gram_per_tl ? parseFloat(editForm.gram_per_tl) : null,
        image_url: editForm.image_url || null,
      };
      const res = await fetch(`/api/ingredients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Opslaan mislukt');
      }
      // Update local state directly instead of re-fetching (avoids cache issues)
      setIngredient(prev => prev ? { ...prev, ...updates } : prev);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Transfer product search ──
  useEffect(() => {
    if (!transferProductId || transferSearch.length < 1) { setTransferResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabaseClient
        .from('generic_ingredients')
        .select('id, name, category')
        .ilike('name', `%${transferSearch}%`)
        .neq('id', id) // exclude current ingredient
        .limit(10);
      setTransferResults((data ?? []) as GenericIngredient[]);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferSearch, transferProductId]);

  const handleTransfer = async (targetIngredientId: string) => {
    if (!transferProductId) return;
    setTransferring(true);
    const res = await fetch(`/api/products/${transferProductId}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generic_ingredient_id: targetIngredientId }),
    });
    if (res.ok) {
      // Remove product from current ingredient's list
      setIngredient((prev) => prev ? {
        ...prev,
        products: prev.products.filter((p) => p.id !== transferProductId),
      } : null);
      setTransferProductId(null);
      setTransferSearch('');
    }
    setTransferring(false);
  };

  // ── Fetch ingredient data ──

  const fetchIngredient = useCallback(async () => {
    try {
      const res = await fetch(`/api/ingredients/${id}?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Ingrediënt niet gevonden');
      const data = await res.json();
      setIngredient(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchIngredient();
  }, [id, fetchIngredient]);

  // ── Generate content via SSE ──

  const handleGenerateContent = async () => {
    if (!id || generating) return;
    setGenerating(true);
    setGenerateProgress('Informatie wordt gegenereerd...');

    try {
      const res = await fetch(`/api/ingredients/${id}/generate-content`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Genereren mislukt');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Geen stream beschikbaar');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              setGenerateProgress('Klaar!');
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.status) setGenerateProgress(parsed.status);
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      }

      // Refresh data after generation
      setLoading(true);
      await fetchIngredient();
    } catch (err: unknown) {
      setGenerateProgress(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setGenerating(false);
    }
  };

  // ── Loading state ──

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Error state ──

  if (error || !ingredient) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-text-muted">{error ?? 'Ingrediënt niet gevonden'}</p>
        <button
          onClick={() => router.push('/ingredienten')}
          className="text-sm font-medium text-primary hover:underline"
        >
          Terug naar ingrediënten
        </button>
      </div>
    );
  }

  const fallbackEmoji =
    CATEGORY_EMOJI[(ingredient.category ?? '').toLowerCase()] ?? '🫙';

  const hasNutrition = ingredient.avg_kcal != null;

  const conversions = [
    { label: 'Per stuk', value: ingredient.gram_per_piece, unit: 'g' },
    { label: 'Per eetlepel', value: ingredient.gram_per_el, unit: 'g' },
    { label: 'Per theelepel', value: ingredient.gram_per_tl, unit: 'g' },
  ].filter((c) => c.value != null);

  const encyclopedieBlocks = [
    { title: 'Beschrijving', content: ingredient.description },
    { title: 'Oorsprong', content: ingredient.origin },
    { title: 'Gebruik', content: ingredient.usage_tips },
    { title: 'Bewaring', content: ingredient.storage_tips },
    { title: 'Seizoen', content: ingredient.season },
    { title: 'Weetje', content: ingredient.fun_facts },
  ];

  const hasEncyclopedieContent = encyclopedieBlocks.some((b) => b.content);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      {/* ── Back button ── */}
      <button
        onClick={() => router.push('/ingredienten')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Ingrediënten
      </button>

      {/* ── Hero section ── */}
      <div className="relative mb-6 overflow-hidden rounded-2xl">
        <div className="relative aspect-[16/9] w-full">
          {ingredient.image_url ? (
            <Image
              src={ingredient.image_url}
              alt={ingredient.name}
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              className="object-cover"
              priority
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/50">
              <span className="text-7xl">{fallbackEmoji}</span>
            </div>
          )}
        </div>

        {/* Category badge overlay */}
        {ingredient.category && (
          <div className="absolute bottom-3 left-3">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {ingredient.category}
            </span>
          </div>
        )}
      </div>

      {/* ── Name + aliases + edit ── */}
      {!editing ? (
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{ingredient.name}</h1>
              {ingredient.name_plural && (
                <p className="mt-0.5 text-sm text-text-muted">
                  Meervoud: {ingredient.name_plural}
                </p>
              )}
              {ingredient.aliases.length > 0 && (
                <p className="mt-1 text-xs text-text-muted">
                  Ook bekend als: {ingredient.aliases.join(', ')}
                </p>
              )}
            </div>
            {(isAdminUser || ingredient.created_by === user?.id) && (
              <button
                onClick={startEditing}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-text-muted transition-colors hover:bg-gray-200 hover:text-text-primary"
                title="Bewerken"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Ingrediënt bewerken</h2>
            <button onClick={() => setEditing(false)} className="text-text-muted hover:text-text-primary">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Naam</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Meervoud</label>
                <input type="text" value={editForm.name_plural} onChange={e => setEditForm(f => ({ ...f, name_plural: e.target.value }))}
                  placeholder="bijv. uien"
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Categorie</label>
              <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Geen</option>
                {['groente', 'fruit', 'vlees', 'vis', 'zuivel', 'granen', 'kruiden', 'overig'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Aliases (komma-gescheiden)</label>
              <input type="text" value={editForm.aliases} onChange={e => setEditForm(f => ({ ...f, aliases: e.target.value }))}
                placeholder="bijv. ajuin, sjalot"
                className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Gram/stuk</label>
                <input type="number" step="0.1" value={editForm.gram_per_piece} onChange={e => setEditForm(f => ({ ...f, gram_per_piece: e.target.value }))}
                  placeholder="bijv. 150"
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Gram/el</label>
                <input type="number" step="0.1" value={editForm.gram_per_el} onChange={e => setEditForm(f => ({ ...f, gram_per_el: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Gram/tl</label>
                <input type="number" step="0.1" value={editForm.gram_per_tl} onChange={e => setEditForm(f => ({ ...f, gram_per_tl: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Afbeelding</label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized />
                    <button type="button" onClick={() => { setImagePreview(null); setEditForm(f => ({ ...f, image_url: '' })); }}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white">&times;</button>
                  </div>
                ) : (
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-text-muted transition-colors hover:border-primary hover:text-primary">
                    <Camera size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImagePreview(URL.createObjectURL(file));
                      try {
                        const supabase = (await import('@/lib/supabase/client')).createClient();
                        const path = `ingredients/${Date.now()}-${file.name}`;
                        const { error: upErr } = await supabase.storage.from('recipe-images').upload(path, file, { contentType: file.type, upsert: true });
                        if (!upErr) {
                          const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
                          setEditForm(f => ({ ...f, image_url: urlData.publicUrl }));
                        }
                      } catch {}
                    }} />
                  </label>
                )}
                <input type="text" value={editForm.image_url} onChange={e => { setEditForm(f => ({ ...f, image_url: e.target.value })); setImagePreview(e.target.value || null); }}
                  placeholder="Of plak een URL"
                  className="flex-1 rounded-lg border border-gray-200 bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdits} disabled={saving || !editForm.name.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Opslaan
              </button>
              <button onClick={() => setEditing(false)}
                className="rounded-lg px-4 py-2 text-sm text-text-muted hover:text-text-primary">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Voedingswaarden card ── */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-text-primary">
          Voedingswaarden
        </h2>

        {hasNutrition ? (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-1.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    Per 100g
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <NutritionRow label="Energie" value={ingredient.avg_kcal} unit=" kcal" />
                <NutritionRow label="Eiwit" value={ingredient.avg_protein} unit="g" />
                <NutritionRow label="Vet" value={ingredient.avg_fat} unit="g" />
                <NutritionRow label="  waarvan verzadigd" value={ingredient.avg_saturated_fat} unit="g" />
                <NutritionRow label="Koolhydraten" value={ingredient.avg_carbs} unit="g" />
                <NutritionRow label="  waarvan suikers" value={ingredient.avg_sugars} unit="g" />
                <NutritionRow label="Vezels" value={ingredient.avg_fiber} unit="g" />
                <NutritionRow label="Zout" value={ingredient.avg_salt} unit="g" />
              </tbody>
            </table>
            <p className="mt-3 text-xs text-text-muted">
              Gebaseerd op {ingredient.product_count}{' '}
              {ingredient.product_count === 1 ? 'product' : 'producten'}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-muted">
            Nog geen voedingswaarden. Scan een product om data toe te voegen.
          </p>
        )}
      </section>

      {/* ── Encyclopedie section ── */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-text-primary">
          Encyclopedie
        </h2>

        {hasEncyclopedieContent ? (
          <div className="flex flex-col gap-3">
            {encyclopedieBlocks.map((block) => (
              <InfoBlock key={block.title} title={block.title} content={block.content} />
            ))}
          </div>
        ) : !ingredient.content_generated_at ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="mb-3 text-sm text-text-muted">
              Er is nog geen encyclopedie-informatie beschikbaar voor dit ingrediënt.
            </p>
            <button
              onClick={handleGenerateContent}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? generateProgress : 'Genereer informatie'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Geen informatie beschikbaar.</p>
        )}

        {/* Show generate button even when there IS content but it was never generated */}
        {hasEncyclopedieContent && !ingredient.content_generated_at && (
          <div className="mt-3">
            <button
              onClick={handleGenerateContent}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? generateProgress : 'Genereer informatie'}
            </button>
          </div>
        )}
      </section>

      {/* ── Varianten ── */}
      {ingredient.variants.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            Varianten
          </h2>
          <div className="flex flex-wrap gap-2">
            {ingredient.variants.map((variant) => (
              <span
                key={variant}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-text-primary"
              >
                {variant}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Conversies ── */}
      {conversions.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            Conversies
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
            <table className="w-full">
              <tbody>
                {conversions.map((c) => (
                  <tr key={c.label} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5 text-sm text-text-muted">{c.label}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-medium text-text-primary">
                      {c.value} {c.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Gekoppelde producten ── */}
      <section className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-text-primary">
          Gekoppelde producten
        </h2>
        {ingredient.products.length > 0 ? (
          <div className="flex flex-col gap-3">
            {ingredient.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                canEdit={isAdminUser || product.scanned_by === user?.id}
                onDeleted={(pid) => {
                  setIngredient((prev) => prev ? {
                    ...prev,
                    products: prev.products.filter((p) => p.id !== pid),
                  } : null);
                }}
                onTransfer={(isAdminUser || product.scanned_by === user?.id) ? (pid) => {
                  setTransferProductId(pid);
                  setTransferSearch('');
                  setTransferResults([]);
                } : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            Nog geen producten gekoppeld. Scan een barcode.
          </p>
        )}
      </section>

      {/* ── Recepten met dit ingrediënt ── */}
      {ingredient.recipe_count > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-text-primary">
            Recepten
          </h2>
          <p className="text-sm text-text-muted">
            Gebruikt in {ingredient.recipe_count}{' '}
            {ingredient.recipe_count === 1 ? 'recept' : 'recepten'}
          </p>
        </section>
      )}

      {/* Transfer product modal */}
      <Modal
        open={!!transferProductId}
        onClose={() => setTransferProductId(null)}
        title="Product verplaatsen"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Kies het ingrediënt waar je dit product naartoe wilt verplaatsen.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={transferSearch}
              onChange={(e) => setTransferSearch(e.target.value)}
              placeholder="Zoek ingrediënt..."
              className="w-full rounded-xl border border-gray-200 bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {transferResults.map((ing) => (
              <button
                key={ing.id}
                onClick={() => handleTransfer(ing.id)}
                disabled={transferring}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="text-lg">{CATEGORY_EMOJI[(ing.category || '').toLowerCase()] || '🍽️'}</span>
                <span className="text-sm font-medium text-text-primary">{ing.name}</span>
                {ing.category && (
                  <span className="ml-auto text-xs text-text-muted">{ing.category}</span>
                )}
              </button>
            ))}
            {transferSearch.length > 0 && transferResults.length === 0 && (
              <p className="py-4 text-center text-sm text-text-muted">Geen ingrediënten gevonden</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
