'use client';

/**
 * ResearchWithME v3.4 — Private Realtime Subscription Hook (Wave 18 P1).
 *
 * Subscribes authenticated users to live RLS-filtered `postgres_changes` on
 * `v34_notifications` and `v34_attention_items` (enabled in Migration 12
 * `supabase_realtime` publication) and automatically unsubscribes on unmount
 * or logout.
 */
import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface RealtimeResearchEvent {
  table: 'v34_notifications' | 'v34_attention_items';
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  receivedAt: string;
}

export function usePrivateResearchRealtime(
  userId: string | null | undefined,
  onEvent?: (event: RealtimeResearchEvent) => void,
): { connected: boolean; lastEventAt: string | null } {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setConnected(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`rwm-private-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'v34_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: unknown; old?: unknown }) => {
          const now = new Date().toISOString();
          setLastEventAt(now);
          const rec = (payload.new || payload.old || {}) as { id?: string };
          onEventRef.current?.({
            table: 'v34_notifications',
            eventType: payload.eventType,
            recordId: String(rec.id ?? ''),
            receivedAt: now,
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'v34_attention_items',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: unknown; old?: unknown }) => {
          const now = new Date().toISOString();
          setLastEventAt(now);
          const rec = (payload.new || payload.old || {}) as { id?: string };
          onEventRef.current?.({
            table: 'v34_attention_items',
            eventType: payload.eventType,
            recordId: String(rec.id ?? ''),
            receivedAt: now,
          });
        },
      )
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      setConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { connected, lastEventAt };
}
