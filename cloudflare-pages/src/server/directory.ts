/**
 * Request-scoped public author directory for the Pages runtime.
 *
 * Shared by the authors API (`server/api/authors.ts`) and the public reader
 * loaders (`server/loaders/public.ts`) so the HTML page and the JSON API
 * cannot drift apart on the delicate part of the contract: a genuinely
 * missing profile is a 404, a Supabase outage is a 5xx — the directory core
 * throws in the latter case and the callers translate that into their error
 * surfaces.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestContext } from './context';
import { getPublicArticleCatalogue } from './stores';
import {
  createAuthorDirectory,
  PROFILE_COLUMNS,
  type AuthorDirectory,
  type ProfileRow,
} from '@/lib/author-directory-core';

/**
 * Mirrors lib/supabase/server.ts's anonymous public read: published profiles
 * only, alphabetical by display name. Rejects on outage — callers choose
 * between degrading (list) and failing (lookup), per the directory contract.
 */
async function queryProfiles(client: SupabaseClient, slug?: string): Promise<ProfileRow[]> {
  let query = client.from('profiles').select(PROFILE_COLUMNS).eq('published', true);
  if (slug) query = query.eq('slug', slug);
  else query = query.order('display_name', { ascending: true });

  const { data, error } = await query;
  if (error) throw new Error(error.message ?? 'Could not read author profiles.');
  return (data ?? []) as ProfileRow[];
}

export function directoryFor(ctx: RequestContext): AuthorDirectory {
  const client = ctx.services.publicClient(ctx);
  return createAuthorDirectory({
    listProfiles: (slug) => {
      if (!client) return Promise.resolve([]);
      return queryProfiles(client, slug);
    },
    listCatalogue: () => getPublicArticleCatalogue(ctx),
  });
}
