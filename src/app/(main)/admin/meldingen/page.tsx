'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  comment: 'Reactie',
  reply: 'Antwoord',
  favorite: 'Favoriet',
  rating: 'Beoordeling',
  comment_like: 'Like',
  collection_follow: 'Volger',
  collection_invite: 'Uitnodiging',
};

const TYPE_COLORS: Record<string, string> = {
  comment: 'bg-blue-100 text-blue-700',
  reply: 'bg-indigo-100 text-indigo-700',
  favorite: 'bg-pink-100 text-pink-700',
  rating: 'bg-yellow-100 text-yellow-700',
  comment_like: 'bg-red-100 text-red-700',
  collection_follow: 'bg-green-100 text-green-700',
  collection_invite: 'bg-purple-100 text-purple-700',
};

function UserAvatar({ url, name }: { url?: string | null; name?: string | null }) {
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
      {url ? (
        <Image src={url} alt={name || ''} width={28} height={28} className="h-full w-full object-cover" unoptimized />
      ) : (
        <span className="text-[10px] font-medium text-text-muted">
          {(name || '?')[0].toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function AdminMeldingenPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLog = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/log?page=${p}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLog(page);
  }, [page, fetchLog]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-4">
      <button
        onClick={() => router.push('/admin')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Admin
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Notificatie Log</h1>
        <span className="text-sm text-text-muted">{total} notificaties totaal</span>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <p className="py-20 text-center text-sm text-text-muted">
          Nog geen notificaties verzonden.
        </p>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                      Datum
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                      Van
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                      Aan
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                      Bericht
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-text-muted">
                      Gelezen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-text-muted">
                        {new Date(n.created_at).toLocaleString('nl-NL', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar url={n.actor?.avatar_url} name={n.actor?.display_name} />
                          <span className="text-xs text-text-primary">
                            {n.actor?.display_name || 'Onbekend'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar url={n.recipient?.avatar_url} name={n.recipient?.display_name} />
                          <span className="text-xs text-text-primary">
                            {n.recipient?.display_name || 'Onbekend'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-xs text-text-primary">
                        {n.message}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            n.is_read ? 'bg-green-400' : 'bg-gray-300'
                          }`}
                          title={n.is_read ? 'Gelezen' : 'Ongelezen'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
              <span className="text-sm text-text-muted">
                Pagina {page} van {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
