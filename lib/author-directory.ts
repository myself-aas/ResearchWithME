import 'server-only';

import { cache } from 'react';
import type { Author, BlogPost } from '@/lib/blog-data';
import { getArticleCatalogue } from '@/lib/cms/catalogue';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getSupabasePublicClient } from '@/lib/supabase/server';

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
 */

interface ProfileRow {
  slug: string;
  display_name: string;
  bio: string;
  role: string;
  domain: string;
  institution: string;
  avatar_url: string;
  orcid: string;
  github: string;
  website: string;
  scholar: string;
  created_at: string;
}

const PROFILE_COLUMNS =
  'slug, display_name, bio, role, domain, institution, avatar_url, orcid, github, website, scholar, created_at';

/**
 * `verifiedVia` is deliberately not set. The orcid and github columns on a
 * profile are self-declared, and the authoritative record —
 * `auth.users.identities`, which the writer application actually checks — is not
 * readable by an anonymous client. Claiming verification from a self-declared
 * string would be the false badge the directory just got rid of, so the
 * identifiers are exposed as plain links and the badge stays unset.
 */
export function profileToAuthor(profile: ProfileRow): Author {
  return {
    id: profile.slug,
    name: profile.display_name,
    avatar: profile.avatar_url,
    bio: profile.bio,
    role: profile.role,
    domain: profile.domain,
    institution: profile.institution || undefined,
    orcid: profile.orcid || undefined,
    github: profile.github || undefined,
    website: profile.website || undefined,
    scholar: profile.scholar || undefined,
    joinedDate: String(new Date(profile.created_at).getUTCFullYear()),
    articleCount: 0,
  };
}

async function queryProfiles(slug?: string): Promise<ProfileRow[]> {
  if (!isSupabaseConfigured) return [];
  let query = getSupabasePublicClient().from('profiles').select(PROFILE_COLUMNS).eq('published', true);
  if (slug) query = query.eq('slug', slug);
  else query = query.order('display_name', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

/**
 * Public author reads are best-effort, matching lib/cms/read.ts: a storage
 * outage degrades to an empty directory and is logged, rather than failing the
 * prerender or returning a 500 to a reader.
 */
async function readProfiles(slug?: string): Promise<ProfileRow[]> {
  try {
    return await queryProfiles(slug);
  } catch (error) {
    console.error('Could not load author profiles:', error);
    return [];
  }
}

/**
 * Every published profile, alphabetically, with a real article count.
 *
 * profileToAuthor cannot know the count -- it only sees one row -- so it leaves
 * articleCount at 0 and this fills it in from one catalogue read shared by every
 * author on the page.
 */
export const listPublishedAuthors = cache(async (): Promise<Author[]> => {
  const [profiles, catalogue] = await Promise.all([readProfiles(), getArticleCatalogue()]);

  const counts = new Map<string, number>();
  for (const article of catalogue) {
    counts.set(article.author.id, (counts.get(article.author.id) ?? 0) + 1);
  }

  return profiles.map((profile) => {
    const author = profileToAuthor(profile);
    return { ...author, articleCount: counts.get(author.id) ?? 0 };
  });
});

/**
 * One published profile, or null when no such profile exists.
 *
 * Deliberately does NOT use readProfiles. A list can legitimately be empty, so
 * the directory degrades on an outage; a lookup cannot. If this swallowed a
 * failed fetch the same way, a three-second Supabase blip would make
 * /author/[id] call notFound() and serve a 404 for an author who does exist --
 * and crawlers read a 404 as "gone", so a transient outage could get real
 * profiles de-indexed. Propagating instead yields a 5xx, which crawlers treat
 * as temporary.
 *
 * So: null means the author genuinely is not published. Anything else throws.
 *
 * Case-insensitive on the slug so an old link to /author/Maya-Lin resolves.
 */
export const getPublishedAuthor = cache(async (id: string): Promise<Author | null> => {
  if (!id) return null;
  const wanted = id.trim().toLowerCase();
  const profiles = await queryProfiles();
  const match = profiles.find((profile) => profile.slug.toLowerCase() === wanted);
  return match ? profileToAuthor(match) : null;
});

export interface AuthorArchive {
  author: Author;
  articles: BlogPost[];
  metrics: {
    totalArticles: number;
    totalLikes: number;
    totalComments: number;
    domains: string[];
    reviewedArtifactsCount: number;
  };
}

/** A published profile plus the published articles attributed to it. */
export const getAuthorArchive = cache(async (id: string): Promise<AuthorArchive | null> => {
  const author = await getPublishedAuthor(id);
  if (!author) return null;

  const articles = (await getArticleCatalogue()).filter(
    (article) => article.author.id === author.id || article.author.name === author.name,
  );

  return {
    author,
    articles,
    metrics: {
      totalArticles: articles.length,
      totalLikes: articles.reduce((total, article) => total + (article.likes ?? 0), 0),
      totalComments: articles.reduce((total, article) => total + (article.commentsCount ?? 0), 0),
      domains: Array.from(new Set(articles.map((article) => article.category))),
      reviewedArtifactsCount: articles.filter((article) => article.reviewedArtifact).length,
    },
  };
});
