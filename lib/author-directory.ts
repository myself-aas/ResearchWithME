import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { AUTHORS, type Author } from '@/lib/blog-data';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSupabasePublicClient } from '@/lib/supabase/server';
import {
  createAuthorDirectory,
  PROFILE_COLUMNS,
  type ProfileRow,
} from './author-directory-core';

/**
 * The public author directory, backed by `public.profiles`.
 *
 * This exists so the author page and the author API read the same rows through
 * one function. A server component must not `fetch` its own origin: on
 * Workers/OpenNext that is a subrequest back into the same Worker, which is
 * wasted latency and counts against the per-request subrequest budget. Both
 * entry points call this instead.
 *
 * Every read uses the anonymous client, so RLS is what enforces published-only
 * visibility; the explicit `published = true` filter is belt and braces rather
 * than the thing doing the work.
 *
 * The query logic lives in lib/author-directory-core.ts so the Pages API
 * handlers can run the same semantics over their request-scoped public client;
 * this module adds React's per-request `cache` and the Node public client.
 */

export { profileToAuthor } from './author-directory-core';
export type { AuthorArchive, ProfileRow } from './author-directory-core';

function seedProfiles(slug?: string): ProfileRow[] {
  const normalizedSlug = slug?.trim().toLowerCase();
  const byId = new Map<string, Author>();
  for (const author of Object.values(AUTHORS)) {
    byId.set(author.id.toLowerCase(), author);
  }
  return [...byId.values()]
    .filter((author) => !normalizedSlug || author.id.toLowerCase() === normalizedSlug)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((author) => ({
      slug: author.id,
      display_name: author.name,
      bio: author.bio,
      role: author.role,
      domain: author.domain,
      institution: author.institution ?? '',
      avatar_url: author.avatar,
      orcid: author.orcid ?? '',
      github: author.github ?? '',
      website: author.website ?? '',
      scholar: author.scholar ?? '',
      created_at: '2026-01-01T00:00:00.000Z',
    }));
}

async function queryProfiles(slug?: string): Promise<ProfileRow[]> {
  if (!isSupabaseConfigured) return seedProfiles(slug);
  let query = getSupabasePublicClient().from('profiles').select(PROFILE_COLUMNS).eq('published', true);
  if (slug) query = query.eq('slug', slug);
  else query = query.order('display_name', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

const directory = createAuthorDirectory({
  listProfiles: queryProfiles,
  listCatalogue: () => getArticleCatalogue(),
});

export const listPublishedAuthors = cache(directory.listPublishedAuthors);

/**
 * The published directory through the incremental cache, for the home page.
 * `/` is dynamic by design (it reads `searchParams` for legacy redirects and
 * search), so without this every request waited on two Supabase reads
 * (profiles + catalogue). Tagged `catalogue` so a studio publish refreshes the
 * article counts; 60 s otherwise.
 */
export const getCachedPublishedAuthors = unstable_cache(() => directory.listPublishedAuthors(), ['published-authors'], {
  revalidate: 60,
  tags: ['catalogue', 'authors'],
});

/**
 * One published profile, or null when no such profile exists.
 *
 * Null means the author genuinely is not published; anything else throws, so a
 * transient outage surfaces as a 5xx rather than a 404 a crawler would treat
 * as "gone". Case-insensitive on the slug.
 */
export const getPublishedAuthor = cache(directory.getPublishedAuthor);

/** A published profile plus the published articles attributed to it. */
export const getAuthorArchive = cache(directory.getAuthorArchive);
