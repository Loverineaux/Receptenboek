'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeSubscriptionOptions {
  table: string;
  schema?: string;
  /** Filter like "recipe_id=eq.xxx" */
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  /** Set to false to disable */
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Uses refs for callbacks so they're always current (no stale closures).
 * Automatically cleans up on unmount.
 */
export function useRealtimeSubscription({
  table,
  schema = 'public',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: RealtimeSubscriptionOptions) {
  // Store callbacks in refs to avoid stale closures
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;
  onDeleteRef.current = onDelete;

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channelName = `rt-${table}-${filter || 'all'}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const opts = { schema, table, ...(filter ? { filter } : {}) };

    channel.on('postgres_changes', { event: 'INSERT', ...opts }, (payload) => {
      onInsertRef.current?.(payload.new);
    });

    channel.on('postgres_changes', { event: 'UPDATE', ...opts }, (payload) => {
      onUpdateRef.current?.(payload.new);
    });

    channel.on('postgres_changes', { event: 'DELETE', ...opts }, (payload) => {
      onDeleteRef.current?.(payload.old);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // Only re-subscribe when table, filter, or enabled changes — NOT when callbacks change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled]);
}

/**
 * Subscribe to all events on a table, calling onAnyChange for each.
 */
export function useRealtimeRefresh({
  table,
  filter,
  onAnyChange,
  enabled = true,
}: {
  table: string;
  filter?: string;
  onAnyChange: () => void;
  enabled?: boolean;
}) {
  useRealtimeSubscription({
    table,
    filter,
    onInsert: onAnyChange,
    onUpdate: onAnyChange,
    onDelete: onAnyChange,
    enabled,
  });
}
