'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

let browserClient: SupabaseClient | null = null;

/**
 * Cookie-backed browser client. Created lazily and reused so auth state and
 * realtime channels stay consistent across components.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, { isSingleton: true });
  }
  return browserClient;
}

export function hasSupabaseBrowserConfig() {
  return isSupabaseConfigured;
}
