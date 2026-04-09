'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, User, FolderOpen } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface AdminCollection {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  user: { id: string; display_name: string | null } | null;
  recipe_count: number;
}

export default function AdminCollectiesPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const filtered = useMemo(() => {
    if (!search) return collections;
    const q = search.toLowerCase();
    return collections.filter((c) => c.title.toLowerCase().includes(q));
  }, [search, collections]);

  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data) => {
        setCollections(data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/collections/${deleteId}`, { method: 'DELETE' });
    setCollections((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
    showToast('Collectie verwijderd');
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-text-primary">Collecties ({collections.length})</h1>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op titel..."
          className="w-full rounded-xl border border-gray-200 bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-text-muted/30" />
          <p className="mt-3 text-sm text-text-muted">Geen collecties</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-surface p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <FolderOpen className="h-5 w-5 text-purple-500" />
              </div>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => router.push(`/collecties/${c.id}`)}
                  className="truncate text-sm font-medium text-text-primary hover:text-primary"
                >
                  {c.title}
                </button>
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span>{c.user?.display_name || 'Anoniem'}</span>
                  <span>• {c.recipe_count} recepten</span>
                  <span>• {new Date(c.created_at).toLocaleDateString('nl-NL')}</span>
                </div>
              </div>
              <button
                onClick={() => setDeleteId(c.id)}
                className="flex-shrink-0 rounded-lg p-2 text-text-muted hover:bg-red-50 hover:text-red-500"
                title="Verwijderen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Collectie verwijderen"
        message="Weet je zeker dat je deze collectie wilt verwijderen? De recepten blijven bestaan."
        variant="danger"
        confirmLabel="Verwijderen"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
