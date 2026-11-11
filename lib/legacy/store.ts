import path from 'node:path';
import { getSupabasePublicClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { LegacyStore } from './types';
import { createLocalLegacyStore } from './local-store';
import { createSupabaseLegacyStore } from './supabase-store';

const DATA_DIR = process.env.RWM_DATA_DIR
  ? path.resolve(process.env.RWM_DATA_DIR)
  : path.join(process.cwd(), 'data');

let localStore: LegacyStore | null = null;

/** Filesystem adapter for demos, local development and tests. */
export function getLocalLegacyStore(): LegacyStore {
  if (!localStore) localStore = createLocalLegacyStore({ dataDir: DATA_DIR });
  return localStore;
}

/**
 * Read/write store for public interaction traffic. Uses a stateless anonymous
 * client (same pattern as getPublicCmsStore) so public pages never depend on
 * cookies; RLS and the RPC grants carry the access rules.
 */
let publicStore: LegacyStore | null = null;
export function getPublicLegacyStore(): LegacyStore {
  if (!isSupabaseConfigured) return getLocalLegacyStore();
  if (!publicStore) publicStore = createSupabaseLegacyStore(getSupabasePublicClient());
  return publicStore;
}
