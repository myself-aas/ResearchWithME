import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient, getSupabasePublicClient } from '@/lib/supabase/server';
import { createLocalCmsStore } from './local-store';
import { createSupabaseCmsStore } from './supabase-store';
import type { CmsStore } from './types';

let localStore: CmsStore | null = null;
let publicStore: CmsStore | null = null;

export function isLocalCmsMode() {
  return !isSupabaseConfigured;
}

/** Filesystem adapter used for demos, local development, and tests. */
export function getLocalCmsStore(): CmsStore {
  if (!localStore) localStore = createLocalCmsStore();
  return localStore;
}

/**
 * Read-only store for public pages. Uses a stateless anonymous client so ISR
 * pages never call `cookies()` and never become dynamic by accident.
 */
export async function getPublicCmsStore(): Promise<CmsStore> {
  if (!isSupabaseConfigured) return getLocalCmsStore();
  if (!publicStore) publicStore = createSupabaseCmsStore(getSupabasePublicClient());
  return publicStore;
}

/** Session-scoped store for the editorial studio. RLS enforces access. */
export async function getEditorCmsStore(): Promise<CmsStore> {
  if (!isSupabaseConfigured) return getLocalCmsStore();
  return createSupabaseCmsStore(await createSupabaseServerClient());
}
