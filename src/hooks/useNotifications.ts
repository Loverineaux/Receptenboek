'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { jsonFetcher, SWR_PAGE_OPTIONS } from '@/lib/swr';
import type { AppNotification } from '@/types';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  // Gedeelde SWR-key: meerdere componenten (ProfileButton, NotificationBell) delen één request
  const { data: countData, mutate: mutateCount } = useSWR<{ count: number }>(
    user ? ['notifications-count', user.id] : null,
    () => jsonFetcher<{ count: number }>('/api/notifications/count'),
    SWR_PAGE_OPTIONS
  );
  const unreadCount = user ? countData?.count ?? 0 : 0;

  // Optimistisch de teller aanpassen zonder te revalideren
  const setUnreadCount = useCallback(
    (next: number | ((prev: number) => number)) => {
      mutateCount(
        (cur) => {
          const prev = cur?.count ?? 0;
          return { count: typeof next === 'function' ? next(prev) : next };
        },
        { revalidate: false }
      );
    },
    [mutateCount]
  );

  // Realtime: listen for new/updated/deleted notifications
  useRealtimeSubscription({
    table: 'notifications',
    filter: user ? `recipient_id=eq.${user.id}` : undefined,
    enabled: !!user,
    onInsert: () => {
      // Alle mounts delen de key: herbereken i.p.v. optellen (voorkomt dubbel tellen)
      mutateCount();
      // If panel is open (notifications loaded), refresh the list
      if (notifications.length > 0) {
        fetch('/api/notifications')
          .then((r) => r.json())
          .then((data) => setNotifications(data.notifications ?? []))
          .catch(() => {});
      }
    },
    onUpdate: (updated) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
      );
      // Recalculate unread count
      mutateCount();
    },
    onDelete: (deleted) => {
      setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
      if (!deleted.is_read) mutateCount();
    },
  });

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.notifications?.filter((n: AppNotification) => !n.is_read).length ?? 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user, setUnreadCount]);

  const markAsRead = useCallback(async (ids: string[]) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, is_read: true }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - ids.filter((id) =>
      notifications.find((n) => n.id === id && !n.is_read)
    ).length));
  }, [notifications, setUnreadCount]);

  const markAsUnread = useCallback(async (ids: string[]) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, is_read: false }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: false } : n))
    );
    setUnreadCount((prev) => prev + ids.filter((id) =>
      notifications.find((n) => n.id === id && n.is_read)
    ).length);
  }, [notifications, setUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true, is_read: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [setUnreadCount]);

  const deleteNotification = useCallback(async (ids: string[]) => {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    setUnreadCount((prev) => Math.max(0, prev - ids.filter((id) =>
      notifications.find((n) => n.id === id && !n.is_read)
    ).length));
  }, [notifications, setUnreadCount]);

  const deleteAll = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setNotifications([]);
    setUnreadCount(0);
  }, [setUnreadCount]);

  return {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  };
}
