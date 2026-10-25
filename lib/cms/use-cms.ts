'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { cmsFetch, isUnauthorized } from './client-api';
import type { CmsComment, CmsPost } from './types';

/**
 * Realtime is a progressive enhancement: when Supabase is configured the studio
 * refetches on database change events. Without it the pages still work via their
 * initial load and the explicit refresh button.
 */
function useRealtimeRefresh(table: 'posts' | 'comments', refresh: () => void) {
  const [live, setLive] = useState(false);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;
    let pending: number | null = null;

    function scheduleRefresh() {
      if (pending) window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        pending = null;
        refreshRef.current();
      }, 250);
    }

    (async () => {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = getSupabaseBrowserClient();
        const channel = supabase
          .channel(`studio-${table}-${Math.random().toString(36).slice(2, 10)}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh)
          .subscribe((status) => {
            if (!disposed) setLive(status === 'SUBSCRIBED');
          });

        cleanup = () => {
          disposed = true;
          if (pending) window.clearTimeout(pending);
          void supabase.removeChannel(channel);
        };
      } catch {
        if (!disposed) setLive(false);
      }
    })();

    return () => {
      disposed = true;
      if (pending) window.clearTimeout(pending);
      cleanup?.();
    };
  }, [table]);

  return live;
}

export function useCmsPosts() {
  const [posts, setPosts] = useState<CmsPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    cmsFetch<{ posts: CmsPost[] }>('/api/cms/posts', { cache: 'no-store' })
      .then((data) => {
        if (!active) return;
        setPosts(data.posts);
        setError(null);
      })
      .catch((cause) => {
        if (!active || isUnauthorized(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Articles could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [nonce]);

  const live = useRealtimeRefresh('posts', reload);

  return { posts, error, loading, live, reload };
}

export function useCmsComments() {
  const [comments, setComments] = useState<CmsComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    cmsFetch<{ comments: CmsComment[] }>('/api/cms/comments', { cache: 'no-store' })
      .then((data) => {
        if (!active) return;
        setComments(data.comments);
        setError(null);
      })
      .catch((cause) => {
        if (!active || isUnauthorized(cause)) return;
        setError(cause instanceof Error ? cause.message : 'Comments could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [nonce]);

  const live = useRealtimeRefresh('comments', reload);

  return { comments, error, loading, live, reload };
}
