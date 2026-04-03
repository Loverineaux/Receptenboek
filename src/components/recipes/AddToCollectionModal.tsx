'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Check, FolderOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface AddToCollectionModalProps {
  recipeId: string;
  open: boolean;
  onClose: () => void;
}

interface CollectionItem {
  id: string;
  title: string;
  hasRecipe: boolean;
}

export default function AddToCollectionModal({ recipeId, open, onClose }: AddToCollectionModalProps) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CollectionItem | null>(null);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);

    fetch('/api/collections')
      .then((res) => res.json())
      .then(async (data) => {
        // Only show collections the user owns or collaborates on
        const editable = (data ?? []).filter(
          (c: any) => c.user_id === user.id || c.is_collaborator
        );

        // Check which contain this recipe
        const results = await Promise.all(
          editable.map(async (c: any) => {
            const res = await fetch(`/api/collections/${c.id}`);
            if (!res.ok) return { id: c.id, title: c.title, hasRecipe: false };
            const detail = await res.json();
            const hasIt = (detail.recipes ?? []).some((r: any) => r.id === recipeId);
            return { id: c.id, title: c.title, hasRecipe: hasIt };
          })
        );

        setCollections(results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, recipeId, user]);

  const handleClick = (collection: CollectionItem) => {
    if (togglingId) return;
    if (collection.hasRecipe) {
      setRemoveTarget(collection);
    } else {
      addToCollection(collection.id);
    }
  };

  const addToCollection = async (collectionId: string) => {
    setTogglingId(collectionId);
    await fetch(`/api/collections/${collectionId}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipeId }),
    });

    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, hasRecipe: true } : c))
    );
    setTogglingId(null);

    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(onClose, 500);
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setTogglingId(removeTarget.id);
    setRemoveTarget(null);

    await fetch(`/api/collections/${removeTarget.id}/recipes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipeId }),
    });

    setCollections((prev) =>
      prev.map((c) => (c.id === removeTarget.id ? { ...c, hasRecipe: false } : c))
    );
    setTogglingId(null);

    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(onClose, 500);
  };

  const createCollection = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      await fetch(`/api/collections/${data.id}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipeId }),
      });

      setCollections((prev) => [
        { id: data.id, title: data.title, hasRecipe: true },
        ...prev,
      ]);
      setNewTitle('');
      setCreating(false);

      // Auto-close after creating + adding
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = setTimeout(onClose, 600);
    }
  };

  return (
    <>
    <Modal open={open} onClose={onClose} title="Opslaan in collectie">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {collections.length === 0 && !creating && (
            <p className="py-4 text-center text-sm text-text-muted">
              Je hebt nog geen collecties. Maak er een aan!
            </p>
          )}

          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={togglingId !== null}
              onClick={() => handleClick(c)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                c.hasRecipe
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                  c.hasRecipe
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {c.hasRecipe ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-sm font-medium transition-colors duration-200 ${
                  c.hasRecipe ? 'text-primary' : 'text-text-primary'
                }`}
              >
                {c.title}
              </span>
              {c.hasRecipe && (
                <span className="ml-auto text-xs text-primary/60">Opgeslagen</span>
              )}
            </button>
          ))}

          {creating ? (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                placeholder="Naam van collectie..."
                autoFocus
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button variant="primary" size="sm" onClick={createCollection} disabled={!newTitle.trim()}>
                Maak
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setNewTitle(''); }}>
                Annuleer
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </div>
              Nieuwe collectie
            </button>
          )}
        </div>
      )}
    </Modal>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Verwijderen uit collectie"
        message={`Weet je zeker dat je dit recept wilt verwijderen uit "${removeTarget?.title ?? ''}"?`}
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        variant="danger"
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
