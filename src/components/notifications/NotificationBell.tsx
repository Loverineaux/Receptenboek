'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Bell, CheckCheck, Trash2, X, MailOpen, Mail,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Zojuist';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}u`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  } = useNotifications();

  // Fetch notifications when panel opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleNotificationClick = (id: string, link: string | null, isRead: boolean) => {
    if (!isRead) markAsRead([id]);
    setOpen(false);
    if (link) router.push(link);
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-gray-100 hover:text-text-primary"
        title="Meldingen"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-surface shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">Meldingen</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                  title="Alles als gelezen markeren"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Alles gelezen</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => setConfirmDeleteAll(true)}
                  className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Alles verwijderen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-gray-100 hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-text-muted">
                <Bell className="h-8 w-8 opacity-20" />
                <p className="text-xs">Geen meldingen</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`group relative border-b border-gray-50 last:border-0 ${
                    n.is_read ? 'bg-surface' : 'bg-primary/5'
                  }`}
                >
                  {/* Main clickable area */}
                  <button
                    onClick={() => handleNotificationClick(n.id, n.link, n.is_read)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    {/* Unread dot */}
                    <div className="flex w-2.5 flex-shrink-0 items-center pt-2">
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                      {n.actor?.avatar_url ? (
                        <Image
                          src={n.actor.avatar_url}
                          alt=""
                          width={32}
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-text-muted">
                          {(n.actor?.display_name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-text-primary">
                        {n.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`rounded-full px-1.5 py-px text-[9px] font-medium ${
                            TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Action buttons (visible on hover) */}
                  <div className="absolute right-2 top-2 hidden items-center gap-0.5 rounded-md border border-gray-200 bg-surface shadow-sm group-hover:flex">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        n.is_read ? markAsUnread([n.id]) : markAsRead([n.id]);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-l-md text-text-muted transition-colors hover:bg-gray-100 hover:text-text-primary"
                      title={n.is_read ? 'Markeer als ongelezen' : 'Markeer als gelezen'}
                    >
                      {n.is_read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification([n.id]);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-r-md text-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteAll}
        title="Meldingen verwijderen"
        message="Weet je zeker dat je alle meldingen wilt verwijderen?"
        confirmLabel="Verwijderen"
        variant="danger"
        onConfirm={() => {
          setConfirmDeleteAll(false);
          deleteAll();
        }}
        onCancel={() => setConfirmDeleteAll(false)}
      />
    </div>
  );
}
