'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface AdminRecipe {
  id: string;
  title: string;
  image_url: string | null;
  bron: string | null;
  created_at: string;
  user: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

const PAGE_SIZE = 50;

export default function AdminReceptenPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchRecipes = useCallback(async (p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((p - 1) * PAGE_SIZE),
    });
    if (q) params.set('search', q);

    const res = await fetch(`/api/recipes?${params}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.recipes ?? [];

    setRecipes(list.map((r: any) => ({
      id: r.id,
      title: r.title,
      image_url: r.image_url,
      bron: r.bron,
      created_at: r.created_at,
      user: r.user,
    })));
    setTotal(data.total ?? list.length);
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchRecipes(page, search), 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchRecipes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/recipes/${deleteId}`, { method: 'DELETE' });
    setRecipes((prev) => prev.filter((r) => r.id !== deleteId));
    setTotal((t) => t - 1);
    setDeleteId(null);
    showToast('Recept verwijderd');
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-text-primary">Recepten ({total})</h1>

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
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-surface p-3">
              {r.image_url ? (
                <img src={r.image_url} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl">🍽️</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{r.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  {r.user && <span>{r.user.display_name || 'Anoniem'}</span>}
                  {r.bron && <span>• {r.bron}</span>}
                  <span>• {new Date(r.created_at).toLocaleDateString('nl-NL')}</span>
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                <button
                  onClick={() => router.push(`/recepten/${r.id}`)}
                  className="rounded-lg p-2 text-text-muted hover:bg-gray-100 hover:text-text-primary"
                  title="Bekijken"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="rounded-lg p-2 text-text-muted hover:bg-red-50 hover:text-red-500"
                  title="Verwijderen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {recipes.length === 0 && (
            <p className="py-12 text-center text-sm text-text-muted">Geen recepten gevonden</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-text-muted">Pagina {page} van {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Recept verwijderen"
        message="Weet je zeker dat je dit recept wilt verwijderen? Dit kan niet ongedaan worden."
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
