'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Loader2, Trash2, Filter } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { AppNotification } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  comment: 'Reactie',
  reply: 'Antwoord',
  favorite: 'Favoriet',
  rating: 'Beoordeling',
  comment_like: 'Like',
  collection_follow: 'Volger',
  collection_invite: 'Uitnodiging',
  share: 'Gedeeld',
};

const TYPE_COLORS: Record<string, string> = {
  comment: 'bg-blue-100 text-blue-700',
  reply: 'bg-indigo-100 text-indigo-700',
  favorite: 'bg-pink-100 text-pink-700',
  rating: 'bg-yellow-100 text-yellow-700',
  comment_like: 'bg-red-100 text-red-700',
  collection_follow: 'bg-green-100 text-green-700',
  collection_invite: 'bg-purple-100 text-purple-700',
  share: 'bg-cyan-100 text-cyan-700',
};

const DATE_FILTERS = [
  { label: 'Alles', value: 0 },
  { label: '24 uur', value: 1 },
  { label: '7 dagen', value: 7 },
  { label: '30 dagen', value: 30 },
  { label: '90 dagen', value: 90 },
];

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(0);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const fetchLog = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (typeFilter) params.set('type', typeFilter);
      if (daysFilter > 0) params.set('days', String(daysFilter));

      const res = await fetch(`/api/notifications/log?${params}`);
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
  }, [typeFilter, daysFilter]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, daysFilter]);

  useEffect(() => {
    fetchLog(page);
  }, [page, fetchLog]);

  const handleCleanup = async () => {
    setConfirmCleanup(false);
    const res = await fetch('/api/notifications/log?days=90', { method: 'DELETE' });
    if (res.ok) {
      const { deleted } = await res.json();
      setCleanupResult(`${deleted} oude meldingen verwijderd`);
      setTimeout(() => setCleanupResult(null), 4000);
      fetchLog(1);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Notificatie Log</h1>
        <span className="text-sm text-text-muted">{total} resultaten</span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="">Alle types</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDaysFilter(f.value)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                daysFilter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-muted hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setConfirmCleanup(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Opschonen (90+ dagen)
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <p className="py-20 text-center text-sm text-text-muted">
          Geen meldingen gevonden{typeFilter || daysFilter ? ' voor deze filters' : ''}.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">Datum</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">Van</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">Aan</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-text-muted">Bericht</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-text-muted">Gelezen</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-text-muted">
                        {new Date(n.created_at).toLocaleString('nl-NL', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar url={n.actor?.avatar_url} name={n.actor?.display_name} />
                          <span className="text-xs text-text-primary">{n.actor?.display_name || 'Onbekend'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar url={n.recipient?.avatar_url} name={n.recipient?.display_name} />
                          <span className="text-xs text-text-primary">{n.recipient?.display_name || 'Onbekend'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-700'}`}>
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-xs text-text-primary">{n.message}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${n.is_read ? 'bg-green-400' : 'bg-gray-300'}`} title={n.is_read ? 'Gelezen' : 'Ongelezen'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
        </>
      )}

      <ConfirmDialog
        open={confirmCleanup}
        title="Meldingen opschonen"
        message="Alle meldingen ouder dan 90 dagen worden permanent verwijderd. Doorgaan?"
        variant="danger"
        confirmLabel="Opschonen"
        onConfirm={handleCleanup}
        onCancel={() => setConfirmCleanup(false)}
      />

      {cleanupResult && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg">
          {cleanupResult}
        </div>
      )}
    </div>
  );
}
