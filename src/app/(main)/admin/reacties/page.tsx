'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash2, User, MessageCircle } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface AdminComment {
  id: string;
  body: string;
  created_at: string;
  recipe_id: string;
  user: { id: string; display_name: string | null; avatar_url: string | null } | null;
  recipe_title: string;
}

export default function AdminReactiesPage() {
  const router = useRouter();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch('/api/admin/comments')
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/admin/comments/${deleteId}`, { method: 'DELETE' });
    setComments((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
    showToast('Reactie verwijderd');
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-text-primary">Reacties ({comments.length})</h1>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageCircle className="h-12 w-12 text-text-muted/30" />
          <p className="mt-3 text-sm text-text-muted">Geen reacties</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-surface p-3">
              <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light">
                {c.user?.avatar_url ? (
                  <Image src={c.user.avatar_url} alt="" fill className="object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-text-primary">{c.user?.display_name || 'Anoniem'}</span>
                  <span className="text-text-muted">op</span>
                  <button
                    onClick={() => router.push(`/recepten/${c.recipe_id}`)}
                    className="font-medium text-primary hover:underline"
                  >
                    {c.recipe_title}
                  </button>
                  <span className="text-text-muted">{new Date(c.created_at).toLocaleDateString('nl-NL')}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">{c.body}</p>
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
        title="Reactie verwijderen"
        message="Weet je zeker dat je deze reactie wilt verwijderen?"
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
