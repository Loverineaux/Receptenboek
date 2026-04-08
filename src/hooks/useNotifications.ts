'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { AppNotification } from '@/types';

export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial unread count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications/count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count);
        }
      } catch {}
    };

    fetchCount();
  }, [user]);

  // Realtime: listen for new/updated/deleted notifications
  useRealtimeSubscription({
    table: 'notifications',
    filter: user ? `recipient_id=eq.${user.id}` : undefined,
    enabled: !!user,
    onInsert: () => {
      setUnreadCount((c) => c + 1);
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
      fetch('/api/notifications/count')
        .then((r) => r.json())
        .then((data) => setUnreadCount(data.count))
        .catch(() => {});
    },
    onDelete: (deleted) => {
      setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
      if (!deleted.is_read) setUnreadCount((c) => Math.max(0, c - 1));
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
  }, [user]);

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
  }, [notifications]);

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
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true, is_read: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

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
  }, [notifications]);

  const deleteAll = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setNotifications([]);
    setUnreadCount(0);
  }, []);

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
