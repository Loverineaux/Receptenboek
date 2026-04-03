'use client';

import { useEffect, useCallback, useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import CollectionCard from '@/components/recipes/CollectionCard';
import PullToRefresh from '@/components/ui/PullToRefresh';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import UserPicker from '@/components/ui/UserPicker';
import type { CollectionWithDetails, UserProfile } from '@/types';

type Tab = 'all' | 'mine';

export default function CollectiesPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [collections, setCollections] = useState<CollectionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [newCollaborators, setNewCollaborators] = useState<Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>[]>([]);
  const [userCollectionRatings, setUserCollectionRatings] = useState<Record<string, number>>({});
  const [initialCollectionRatings, setInitialCollectionRatings] = useState<Record<string, number>>({});

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/collections');
    const data = await res.json();
    setCollections(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Listen for FAB button event
  useEffect(() => {
    const handler = () => setCreateOpen(true);
    window.addEventListener('fab:new-collection', handler);
    return () => window.removeEventListener('fab:new-collection', handler);
  }, []);

  // Load user's collection ratings
  useEffect(() => {
    if (!user || collections.length === 0) return;
    supabase
      .from('collection_ratings')
      .select('collection_id, sterren')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach((r: any) => { map[r.collection_id] = r.sterren; });
        setUserCollectionRatings(map);
        setInitialCollectionRatings(map);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, collections.length]);

  const handleCollectionRate = useCallback(async (collectionId: string, rating: number) => {
    if (!user) return;
    const newRating = rating === userCollectionRatings[collectionId] ? 0 : rating;
    setUserCollectionRatings((prev) => {
      const n = { ...prev };
      if (newRating === 0) delete n[collectionId];
      else n[collectionId] = newRating;
      return n;
    });
    await fetch(`/api/collections/${collectionId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sterren: newRating }),
    });
  }, [user, userCollectionRatings]);

  const filtered = tab === 'mine' && user
    ? collections.filter((c) => c.user_id === user.id || c.is_following || c.is_collaborator)
    : collections;

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);

    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() || null }),
    });

    if (res.ok) {
      const data = await res.json();

      // Add collaborators if any
      for (const collab of newCollaborators) {
        await fetch(`/api/collections/${data.id}/collaborators`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: collab.id }),
        });
      }

      setCollections((prev) => [{
        ...data,
        user: profile ? { id: user!.id, display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
        recipe_count: 0,
        preview_images: [],
      }, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setNewCollaborators([]);
      setCreateOpen(false);
    }
    setCreating(false);
  };

  return (
    <PullToRefresh onRefresh={fetchCollections}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-text-primary">Collecties</h1>
        </div>
      </div>

      {/* Tabs */}
      {user && (
        <div className="flex border-b">
          {([
            { key: 'all' as Tab, label: 'Alle collecties' },
            { key: 'mine' as Tab, label: 'Mijn collecties' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              onRate={user ? handleCollectionRate : undefined}
              userRating={userCollectionRatings[c.id]}
              initialUserRating={initialCollectionRatings[c.id] ?? 0}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl">📚</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">
            {tab === 'mine' ? 'Je hebt nog geen collecties' : 'Nog geen collecties'}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Maak je eerste collectie aan en verzamel je favoriete recepten!
          </p>
          {user && (
            <Button variant="primary" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nieuwe collectie
            </Button>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nieuwe collectie"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuleren
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim() || creating}>
              {creating ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Titel *
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Bijv. BBQ Favorieten"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Beschrijving
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Waar gaat deze collectie over?"
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Medewerkers
            </label>
            <p className="mb-2 text-xs text-text-muted">
              Medewerkers kunnen recepten toevoegen en verwijderen. (optioneel, max 10)
            </p>
            <UserPicker
              selectedUsers={newCollaborators}
              onAdd={(u) => setNewCollaborators((prev) => [...prev, u])}
              onRemove={(id) => setNewCollaborators((prev) => prev.filter((u) => u.id !== id))}
              maxUsers={10}
            />
          </div>
        </div>
      </Modal>
    </div>
    </PullToRefresh>
  );
}
