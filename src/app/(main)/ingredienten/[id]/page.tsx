'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Sparkles, Loader2, Pencil, X, Check, Camera, Search } from 'lucide-react';
import ProductCard from '@/components/ingredients/ProductCard';
import IngredientTile from '@/components/ingredients/IngredientTile';
import SeasonBar from '@/components/ingredients/SeasonBar';
import NutritionGrid from '@/components/ingredients/NutritionGrid';
import RecipeMiniCard, { type RecipeMini } from '@/components/ingredients/RecipeMiniCard';
import Modal from '@/components/ui/Modal';
import Tag from '@/components/ui/Tag';
import IconButton from '@/components/ui/IconButton';
import { bypassImageOptimizer } from '@/lib/images';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useRealtimeRefresh } from '@/hooks/useRealtimeSubscription';
import { createClient } from '@/lib/supabase/client';
import { categoryLabel, categoryTint, formatNumberNl, initialOf } from '@/lib/ingredients/category';
import { currentMonth, isSeasonal } from '@/lib/ingredients/season';
import type { GenericIngredientWithProducts, GenericIngredient } from '@/types';

const INPUT_CLASS =
  'w-full rounded-input border border-line bg-surface px-3 py-2 text-[15px] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

// ── Nutrition row helper (uitklapbare volledige tabel) ──

function NutritionRow({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <tr className="border-b border-line-soft last:border-0">
      <td className="py-2 text-sm text-ink-3">{label}</td>
      <td className="tabular py-2 text-right text-sm font-medium text-ink">
        {formatNumberNl(value)}
        {unit}
      </td>
    </tr>
  );
}

// ── Encyclopedie block helper ──

function InfoBlock({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h3 className="mb-1.5 text-meta font-semibold text-ink-3">{title}</h3>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{content}</p>
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

  // Recepten met dit ingrediënt (zichtbaarheid via RLS, zoals de receptenlijsten)
  const [recipes, setRecipes] = useState<RecipeMini[]>([]);
  const [recipeTotal, setRecipeTotal] = useState(0);

  // Transfer product state
  const [transferProductId, setTransferProductId] = useState<string | null>(null);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferResults, setTransferResults] = useState<GenericIngredient[]>([]);
  const [transferring, setTransferring] = useState(false);
  const supabaseClient = createClient();

  // Generate-content state
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', name_plural: '', category: '', aliases: '',
    gram_per_piece: '', gram_per_el: '', gram_per_tl: '',
    image_url: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const month = useMemo(() => currentMonth(), []);

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
      const res = await fetch(`/api/ingredients/${id}`, { cache: 'no-store' });
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

  // Recepten met dit ingrediënt: zelfde zichtbaarheid als de receptenlijsten (RLS: openbaar of eigen)
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data, count } = await supabaseClient
        .from('recipes')
        .select('id, title, image_url, tijd, ingredients!inner(generic_ingredient_id)', { count: 'exact' })
        .eq('ingredients.generic_ingredient_id', id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (cancelled) return;
      const rows = (data ?? []) as unknown as RecipeMini[];
      setRecipes(rows);
      setRecipeTotal(count ?? rows.length);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Realtime: ingredient and product changes
  useRealtimeRefresh({ table: 'generic_ingredients', filter: `id=eq.${id}`, onAnyChange: fetchIngredient, enabled: !!ingredient });
  useRealtimeRefresh({ table: 'products', filter: `generic_ingredient_id=eq.${id}`, onAnyChange: fetchIngredient, enabled: !!ingredient });

  // ── Generate content via SSE ──

  const handleGenerateContent = async () => {
    if (!id || generating) return;
    setGenerating(true);
    setGenerateError(null);
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
                if (parsed.type === 'error') {
                  setGenerateError(parsed.message || 'Genereren mislukt');
                } else if (parsed.message || parsed.status) {
                  setGenerateProgress(parsed.message || parsed.status);
                }
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
      setGenerateError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setGenerating(false);
    }
  };

  // ── Loading state ──

  if (loading) {
    return (
      <div className="md:mx-auto md:max-w-2xl" aria-busy="true">
        <div className="-mx-gutter -mt-3 h-[300px] animate-pulse bg-sunk md:mx-0 md:mt-0 md:rounded-card-lg" />
        <div className="relative -mt-[30px] space-y-3 rounded-t-sheet bg-background px-gutter pt-6 md:px-0">
          <div className="h-6 w-28 animate-pulse rounded-tag bg-sunk" />
          <div className="h-10 w-2/3 animate-pulse rounded-input bg-sunk" />
          <div className="h-16 animate-pulse rounded-input bg-sunk" />
        </div>
      </div>
    );
  }

  // ── Error state ──

  if (error || !ingredient) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-ink-3">{error ?? 'Ingrediënt niet gevonden'}</p>
        <Button variant="secondary" onClick={() => router.push('/ingredienten')}>
          Terug naar ingrediënten
        </Button>
      </div>
    );
  }

  const seasonMonths = ingredient.season_months;
  const inSeasonNow = isSeasonal(seasonMonths, month);

  const hasNutrition = [
    ingredient.avg_kcal, ingredient.avg_protein, ingredient.avg_carbs, ingredient.avg_fat,
  ].some((v) => v != null);

  const conversions = [
    { label: 'Per stuk', value: ingredient.gram_per_piece, unit: 'g' },
    { label: 'Per eetlepel', value: ingredient.gram_per_el, unit: 'g' },
    { label: 'Per theelepel', value: ingredient.gram_per_tl, unit: 'g' },
  ].filter((c) => c.value != null);

  const encyclopedieBlocks = [
    { title: 'Oorsprong', content: ingredient.origin },
    { title: 'Gebruik', content: ingredient.usage_tips },
    { title: 'Weetje', content: ingredient.fun_facts },
  ];
  const hasEncyclopedieBlocks = encyclopedieBlocks.some((b) => b.content);
  const hasAnyContent =
    hasEncyclopedieBlocks ||
    !!(ingredient.description || ingredient.storage_tips || ingredient.season);
  const canEdit = isAdminUser || ingredient.created_by === user?.id;

  const generateButton = (variant: 'primary' | 'secondary') => (
    <div>
      <Button variant={variant} onClick={handleGenerateContent} disabled={generating}>
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? generateProgress : 'Genereer informatie'}
      </Button>
      {generateError && (
        <p role="alert" className="mt-2 text-sm text-error">
          {generateError}
        </p>
      )}
    </div>
  );

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/ingredienten');
  };

  return (
    <div className="md:mx-auto md:max-w-2xl">
      {/* ── Hero (300px, full-bleed op mobiel) ── */}
      <div className="-mx-gutter -mt-3 md:mx-0 md:mt-0">
        <div
          className={`relative h-[300px] overflow-hidden md:rounded-card-lg ${
            ingredient.image_url ? 'bg-placeholder-2' : categoryTint(ingredient.category)
          }`}
        >
          {ingredient.image_url ? (
            <Image
              src={ingredient.image_url}
              alt={ingredient.name}
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              className="object-cover"
              priority
              unoptimized={bypassImageOptimizer(ingredient.image_url)}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center font-display text-[140px] font-semibold leading-none text-ink/25"
            >
              {initialOf(ingredient.name)}
            </div>
          )}
          <div className="photo-fade-top pointer-events-none absolute inset-x-0 top-0 h-[120px]" />
          <div className="absolute inset-x-[18px] top-4 flex justify-between">
            <IconButton variant="photo" label="Terug" onClick={goBack}>
              <ArrowLeft className="h-[19px] w-[19px]" strokeWidth={2} />
            </IconButton>
            {canEdit && !editing && (
              <IconButton variant="photo" label="Ingrediënt bewerken" onClick={startEditing}>
                <Pencil className="h-[17px] w-[17px]" strokeWidth={2} />
              </IconButton>
            )}
          </div>
        </div>
      </div>

      {/* ── Sheet ── */}
      <div className="relative -mt-[30px] rounded-t-sheet bg-background px-gutter pt-6 md:px-0">
        {!editing ? (
          <>
            <div className="flex flex-wrap gap-2">
              {ingredient.category && <Tag variant="tint">{categoryLabel(ingredient.category)}</Tag>}
              {inSeasonNow && <Tag variant="season">In seizoen</Tag>}
            </div>
            <h1 className="mt-3 font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-ink text-pretty">
              {ingredient.name}
            </h1>
            {ingredient.name_plural && (
              <p className="mt-1.5 text-meta text-ink-3">Meervoud: {ingredient.name_plural}</p>
            )}
            {ingredient.aliases.length > 0 && (
              <p className="mt-1 text-meta text-ink-3">Ook bekend als: {ingredient.aliases.join(', ')}</p>
            )}
            {ingredient.description && (
              <p className="mt-3 text-body text-ink-2 text-pretty">{ingredient.description}</p>
            )}
          </>
        ) : (
          <div className="rounded-card border border-primary/30 bg-primary-tint/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink">Ingrediënt bewerken</h2>
              <IconButton variant="sunk" label="Bewerken sluiten" onClick={() => setEditing(false)}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-meta font-medium text-ink-3">Naam</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-meta font-medium text-ink-3">Meervoud</label>
                  <input type="text" value={editForm.name_plural} onChange={e => setEditForm(f => ({ ...f, name_plural: e.target.value }))}
                    placeholder="bijv. uien" className={INPUT_CLASS} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-meta font-medium text-ink-3">Categorie</label>
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className={INPUT_CLASS}>
                  <option value="">Geen</option>
                  {['groente', 'fruit', 'vlees', 'vis', 'zuivel', 'granen', 'kruiden', 'overig'].map(c => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-meta font-medium text-ink-3">Aliases (komma-gescheiden)</label>
                <input type="text" value={editForm.aliases} onChange={e => setEditForm(f => ({ ...f, aliases: e.target.value }))}
                  placeholder="bijv. ajuin, sjalot" className={INPUT_CLASS} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-meta font-medium text-ink-3">Gram/stuk</label>
                  <input type="number" step="0.1" value={editForm.gram_per_piece} onChange={e => setEditForm(f => ({ ...f, gram_per_piece: e.target.value }))}
                    placeholder="bijv. 150" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-meta font-medium text-ink-3">Gram/el</label>
                  <input type="number" step="0.1" value={editForm.gram_per_el} onChange={e => setEditForm(f => ({ ...f, gram_per_el: e.target.value }))}
                    className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="mb-1 block text-meta font-medium text-ink-3">Gram/tl</label>
                  <input type="number" step="0.1" value={editForm.gram_per_tl} onChange={e => setEditForm(f => ({ ...f, gram_per_tl: e.target.value }))}
                    className={INPUT_CLASS} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-meta font-medium text-ink-3">Afbeelding</label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-icon-btn border border-line">
                      <Image src={imagePreview} alt="Voorbeeld" fill className="object-cover" unoptimized />
                      <button type="button" aria-label="Afbeelding verwijderen" onClick={() => { setImagePreview(null); setEditForm(f => ({ ...f, image_url: '' })); }}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white">&times;</button>
                    </div>
                  ) : (
                    <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-icon-btn border-2 border-dashed border-line-strong text-ink-3 transition-colors hover:border-primary hover:text-primary">
                      <Camera size={20} />
                      <span className="sr-only">Afbeelding kiezen</span>
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
                    placeholder="Of plak een URL" aria-label="Afbeeldings-URL"
                    className={`${INPUT_CLASS} flex-1 text-xs`} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={saveEdits} disabled={saving || !editForm.name.trim()}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Opslaan
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Seizoen ── */}
        {(seasonMonths || ingredient.season) && (
          <section aria-label="Seizoen">
            <h2 className="mt-[22px] text-meta font-semibold text-ink-3">Seizoen</h2>
            {seasonMonths ? (
              <SeasonBar months={seasonMonths} month={month} />
            ) : (
              <p className="mt-2 text-[15px] text-ink-2">{ingredient.season}</p>
            )}
          </section>
        )}

        {/* ── Per 100 gram ── */}
        <section aria-label="Voedingswaarden per 100 gram">
          <h2 className="mt-[22px] text-meta font-semibold text-ink-3">Per 100 gram</h2>
          {hasNutrition ? (
            <>
              <NutritionGrid
                kcal={ingredient.avg_kcal}
                protein={ingredient.avg_protein}
                carbs={ingredient.avg_carbs}
                fat={ingredient.avg_fat}
              />
              <details className="mt-2 rounded-card border border-line bg-surface px-4">
                <summary className="flex min-h-[44px] cursor-pointer items-center text-[14px] font-medium text-primary">
                  Alle voedingswaarden
                </summary>
                <table className="mb-1 w-full">
                  <tbody>
                    <NutritionRow label="Energie" value={ingredient.avg_kcal} unit=" kcal" />
                    <NutritionRow label="Eiwit" value={ingredient.avg_protein} unit=" g" />
                    <NutritionRow label="Vet" value={ingredient.avg_fat} unit=" g" />
                    <NutritionRow label="waarvan verzadigd" value={ingredient.avg_saturated_fat} unit=" g" />
                    <NutritionRow label="Koolhydraten" value={ingredient.avg_carbs} unit=" g" />
                    <NutritionRow label="waarvan suikers" value={ingredient.avg_sugars} unit=" g" />
                    <NutritionRow label="Vezels" value={ingredient.avg_fiber} unit=" g" />
                    <NutritionRow label="Zout" value={ingredient.avg_salt} unit=" g" />
                  </tbody>
                </table>
                <p className="pb-3 text-meta text-ink-3">
                  Gebaseerd op {ingredient.product_count}{' '}
                  {ingredient.product_count === 1 ? 'product' : 'producten'}
                </p>
              </details>
            </>
          ) : (
            <p className="mt-2 text-[15px] text-ink-3">
              Nog geen voedingswaarden. Scan een product om data toe te voegen.
            </p>
          )}
        </section>

        {/* ── Bewaartip ── */}
        {ingredient.storage_tips && (
          <div className="mt-3.5 rounded-[18px] bg-sunk px-4 py-3.5 text-sm leading-normal text-ink-2">
            <strong className="font-semibold">Bewaren:</strong> {ingredient.storage_tips}
          </div>
        )}
      </div>

      {/* ── Recepten met dit ingrediënt ── */}
      {recipes.length > 0 && (
        <section aria-label={`Recepten met ${ingredient.name.toLowerCase()}`}>
          <SectionHeader
            title={`Recepten met ${ingredient.name.toLowerCase()}`}
            action={recipeTotal}
          />
          <div className="-mx-gutter flex gap-3 overflow-x-auto px-gutter scrollbar-none md:mx-0 md:px-0">
            {recipes.map((r) => (
              <RecipeMiniCard key={r.id} recipe={r} />
            ))}
          </div>
        </section>
      )}

      {/* ── Encyclopedie ── */}
      {(hasEncyclopedieBlocks || !ingredient.content_generated_at) && (
        <section>
          <SectionHeader title="Encyclopedie" />
          {hasEncyclopedieBlocks && (
            <div className="flex flex-col gap-3">
              {encyclopedieBlocks.map((block) => (
                <InfoBlock key={block.title} title={block.title} content={block.content} />
              ))}
            </div>
          )}
          {!ingredient.content_generated_at && (
            <div
              className={
                hasAnyContent
                  ? 'mt-3'
                  : 'rounded-card border border-dashed border-line-strong p-6 text-center'
              }
            >
              {!hasAnyContent && (
                <p className="mb-3 text-[15px] text-ink-3">
                  Er is nog geen encyclopedie-informatie beschikbaar voor dit ingrediënt.
                </p>
              )}
              <div className={hasAnyContent ? '' : 'flex justify-center'}>
                {generateButton(hasAnyContent ? 'secondary' : 'primary')}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Varianten ── */}
      {ingredient.variants.length > 0 && (
        <section>
          <SectionHeader title="Varianten" />
          <div className="flex flex-wrap gap-2">
            {ingredient.variants.map((variant) => (
              <Tag key={variant} variant="outline">
                {variant}
              </Tag>
            ))}
          </div>
        </section>
      )}

      {/* ── Conversies ── */}
      {conversions.length > 0 && (
        <section>
          <SectionHeader title="Conversies" />
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <table className="w-full">
              <tbody>
                {conversions.map((c) => (
                  <tr key={c.label} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-3 text-sm text-ink-3">{c.label}</td>
                    <td className="tabular px-4 py-3 text-right text-sm font-medium text-ink">
                      {formatNumberNl(c.value as number)} {c.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Gekoppelde producten ── */}
      <section className="pb-6">
        <SectionHeader title="Gekoppelde producten" />
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
          <p className="text-[15px] text-ink-3">Nog geen producten gekoppeld. Scan een barcode.</p>
        )}
      </section>

      {/* Transfer product modal */}
      <Modal
        open={!!transferProductId}
        onClose={() => setTransferProductId(null)}
        title="Product verplaatsen"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-3">
            Kies het ingrediënt waar je dit product naartoe wilt verplaatsen.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={transferSearch}
              onChange={(e) => setTransferSearch(e.target.value)}
              placeholder="Zoek ingrediënt..."
              aria-label="Zoek ingrediënt"
              className="h-11 w-full rounded-input border border-line bg-surface pl-10 pr-4 text-[15px] text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {transferResults.map((ing) => (
              <button
                key={ing.id}
                onClick={() => handleTransfer(ing.id)}
                disabled={transferring}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-input px-3 py-2 text-left transition-colors hover:bg-sunk disabled:opacity-50"
              >
                <IngredientTile name={ing.name} category={ing.category} className="h-8 w-8 rounded-[10px] text-sm" />
                <span className="text-[15px] font-medium text-ink">{ing.name}</span>
                {ing.category && (
                  <span className="ml-auto text-meta text-ink-3">{categoryLabel(ing.category)}</span>
                )}
              </button>
            ))}
            {transferSearch.length > 0 && transferResults.length === 0 && (
              <p className="py-4 text-center text-sm text-ink-3">Geen ingrediënten gevonden</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
