'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import BottomSheet from '@/components/ui/BottomSheet';

interface MiniRecipe {
  title: string;
  image_url: string | null;
  tijd?: string | null;
}

interface AddToCollectionModalProps {
  recipeId: string;
  open: boolean;
  onClose: () => void;
  /** Optioneel: voorkomt een extra fetch voor de mini-receptkaart */
  recipe?: MiniRecipe;
}

interface CollectionItem {
  id: string;
  title: string;
  count: number;
  hasRecipe: boolean;
}

/**
 * "Bewaar in collectie" (design v2, scherm 06): bottom sheet met meerkeuze.
 * Elke tik voegt het recept direct toe of haalt het weg; de telling loopt live mee.
 */
export default function AddToCollectionModal({ recipeId, open, onClose, recipe }: AddToCollectionModalProps) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [fetchedRecipe, setFetchedRecipe] = useState<MiniRecipe | null>(null);
  const supabaseRef = useRef(createClient());

  const mini = recipe ?? fetchedRecipe;

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCreating(false);
    setNewTitle('');

    const supabase = supabaseRef.current;

    Promise.all([
      fetch('/api/collections').then((res) => (res.ok ? res.json() : [])),
      supabase.from('collection_recipes').select('collection_id').eq('recipe_id', recipeId),
    ])
      .then(([data, membership]) => {
        if (cancelled) return;
        const memberOf = new Set((membership.data ?? []).map((m: any) => m.collection_id));
        const editable = (Array.isArray(data) ? data : []).filter(
          (c: any) => c.user_id === user.id || c.is_collaborator
        );
        setCollections(
          editable.map((c: any) => ({
            id: c.id,
            title: c.title,
            count: c.recipe_count ?? 0,
            hasRecipe: memberOf.has(c.id),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setError('Collecties laden mislukt.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, recipeId, user]);

  useEffect(() => {
    if (!open || recipe) return;
    supabaseRef.current
      .from('recipes')
      .select('title, image_url, tijd')
      .eq('id', recipeId)
      .single()
      .then(({ data }) => {
        if (data) setFetchedRecipe(data as MiniRecipe);
      });
  }, [open, recipeId, recipe]);

  const setMembership = (id: string, hasRecipe: boolean) =>
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hasRecipe, count: Math.max(0, c.count + (hasRecipe ? 1 : -1)) } : c))
    );

  const toggle = async (c: CollectionItem) => {
    if (busyIds.has(c.id)) return;
    const adding = !c.hasRecipe;
    setError(null);
    setBusyIds((prev) => new Set(prev).add(c.id));
    setMembership(c.id, adding); // optimistisch

    try {
      const res = await fetch(`/api/collections/${c.id}/recipes`, {
        method: adding ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipeId }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setMembership(c.id, !adding);
      setError('Bijwerken mislukt. Probeer het opnieuw.');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
    }
  };

  const createCollection = async () => {
    const title = newTitle.trim();
    if (!title || busyCreate) return;
    setBusyCreate(true);
    setError(null);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      const addRes = await fetch(`/api/collections/${data.id}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipeId }),
      });
      setCollections((prev) => [
        { id: data.id, title: data.title ?? title, count: addRes.ok ? 1 : 0, hasRecipe: addRes.ok },
        ...prev,
      ]);
      setNewTitle('');
      setCreating(false);
      if (!addRes.ok) setError('Collectie gemaakt, maar het recept toevoegen mislukte.');
    } catch {
      setError('Collectie maken mislukt. Probeer het opnieuw.');
    } finally {
      setBusyCreate(false);
    }
  };

  const savedCount = collections.filter((c) => c.hasRecipe).length;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Bewaar in collectie"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-[54px] w-full rounded-btn bg-primary text-base font-semibold text-on-primary shadow-btn-primary transition-colors hover:bg-primary-dark"
        >
          {savedCount > 0
            ? `Bewaard in ${savedCount} ${savedCount === 1 ? 'collectie' : 'collecties'}`
            : 'Klaar'}
        </button>
      }
    >
      {mini && (
        <div className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-2.5">
          <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-xl bg-placeholder">
            {mini.image_url && (
              <Image src={mini.image_url} alt="" fill sizes="52px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-ink">{mini.title}</div>
            {mini.tijd && <div className="mt-0.5 text-meta text-ink-3">{mini.tijd}</div>}
          </div>
        </div>
      )}

      <div className="mt-3.5">
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[58px] animate-pulse rounded-input bg-sunk" />
            ))}
          </div>
        ) : (
          <>
            {collections.length === 0 && !creating && (
              <p className="py-4 text-center text-sm text-ink-3">
                Je hebt nog geen collecties. Maak er een aan!
              </p>
            )}

            {collections.map((c) => (
              <button
                key={c.id}
                type="button"
                role="checkbox"
                aria-checked={c.hasRecipe}
                disabled={busyIds.has(c.id)}
                onClick={() => toggle(c)}
                className="flex min-h-[58px] w-full items-center gap-3.5 border-b border-line text-left"
              >
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-primary-tint font-display text-lg font-semibold text-primary">
                  {c.title.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15.5px] font-semibold text-ink">{c.title}</span>
                  <span className="tabular mt-px block text-meta text-ink-3">
                    {c.count} {c.count === 1 ? 'recept' : 'recepten'}
                  </span>
                </span>
                <span
                  className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                    c.hasRecipe ? 'border-primary bg-primary' : 'border-line-strong bg-transparent'
                  }`}
                >
                  {c.hasRecipe && <Check className="h-3.5 w-3.5 text-on-primary" strokeWidth={3} />}
                </span>
              </button>
            ))}

            {creating ? (
              <div className="flex items-center gap-2 py-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                  placeholder="Naam van de collectie"
                  aria-label="Naam van de collectie"
                  autoFocus
                  maxLength={80}
                  className="h-11 min-w-0 flex-1 rounded-input border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={createCollection}
                  disabled={!newTitle.trim() || busyCreate}
                  className="h-11 rounded-icon-btn bg-primary px-4 text-[15px] font-semibold text-on-primary disabled:opacity-50"
                >
                  Maak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setNewTitle('');
                  }}
                  className="h-11 rounded-icon-btn px-2 text-[15px] font-semibold text-ink-3 hover:bg-sunk"
                >
                  Annuleer
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex min-h-[58px] w-full items-center gap-3.5 text-left text-[15.5px] font-semibold text-primary"
              >
                <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#9FC2A8]">
                  <Plus className="h-5 w-5" strokeWidth={2.2} />
                </span>
                Nieuwe collectie
              </button>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
