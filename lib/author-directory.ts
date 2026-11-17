import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { AUTHORS, type Author } from '@/lib/blog-data';
import { EDITOR_IN_CHIEF } from '@/lib/research-data';
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
 * The editor-in-chief is a real, single role on this product, and the public
 * "Editor" page links straight to their profile. If their `profiles` row has
 * not been published yet, that link used to 404, which made both the editor page
 * and the writers directory look broken. Resolving the known editor to a
 * truthful minimal profile keeps the link honest without inventing contribution
 * history: article counts stay at zero until real articles exist.
 */
function editorProfileFallback(): Author {
  return {
    id: EDITOR_IN_CHIEF.profileSlug,
    name: EDITOR_IN_CHIEF.name,
    avatar: '',
    bio: 'Editor-in-Chief of ResearchWithMe. Reviews published here are checked against their primary sources before they go live.',
    role: EDITOR_IN_CHIEF.role,
    domain: 'Editorial',
    joinedDate: '2026',
    articleCount: 0,
  };
}

function isEditorSlug(id: string): boolean {
  return id.trim().toLowerCase() === EDITOR_IN_CHIEF.profileSlug.toLowerCase();
}

const resolvePublishedAuthor = cache(directory.getPublishedAuthor);

/**
 * One published profile, or null when no such profile exists. Case-insensitive
 * on the slug; the known editor-in-chief resolves to a minimal profile so the
 * public Editor page never links to a 404.
 *
 * Null means the author genuinely is not published; anything else throws, so a
 * transient outage surfaces as a 5xx rather than a 404 a crawler would treat
 * as "gone".
 */
export const getPublishedAuthor = cache(async (id: string): Promise<Author | null> => {
  const found = await resolvePublishedAuthor(id);
  if (found) return found;
  return isEditorSlug(id) ? editorProfileFallback() : null;
});

/** A published profile plus the published articles attributed to it. */
export const getAuthorArchive = cache(async (id: string) => {
  const archive = await directory.getAuthorArchive(id);
  if (archive) return archive;
  if (!isEditorSlug(id)) return null;
  return {
    author: editorProfileFallback(),
    articles: [],
    metrics: {
      totalArticles: 0,
      totalLikes: 0,
      totalComments: 0,
      domains: [],
      reviewedArtifactsCount: 0,
    },
  };
});
