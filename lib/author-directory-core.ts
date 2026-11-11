import type { Author, BlogPost } from '@/lib/blog-data';

/**
 * Edge-safe author-directory core, shared by the Next.js wrapper
 * (lib/author-directory.ts, which adds React `cache` and the Node public
 * client) and the Pages API handlers (cloudflare-pages/src/server/api/authors.ts,
 * which supplies the request-scoped public client). No Next, no node:* imports.
 *
 * Semantics that must hold everywhere:
 *
 *   - a list read may degrade to empty (an empty directory is a valid state)
 *   - a single lookup must NOT, because /author/[id] and the author API turn
 *     null into a 404 — a transient outage must not de-index a real profile
 *   - RLS enforces published-only visibility; the explicit filter is belt and
 *     braces
 */

export interface ProfileRow {
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

export const PROFILE_COLUMNS =
  'slug, display_name, bio, role, domain, institution, avatar_url, orcid, github, website, scholar, created_at';

/**
 * `verifiedVia` is deliberately not set. The orcid and github columns on a
 * profile are self-declared, and the authoritative record — auth.users.identities,
 * which the writer application actually checks — is not readable by an anonymous
 * client. Claiming verification from a self-declared string would be the false
 * badge the directory just got rid of, so the identifiers are exposed as plain
 * links and the badge stays unset.
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

export interface AuthorDirectoryDeps {
  /**
   * Published profiles, alphabetical by display name when unfiltered.
   * MUST reject on outage — callers decide between degrading (list) and
   * propagating (lookup).
   */
  listProfiles(slug?: string): Promise<ProfileRow[]>;
  listCatalogue(): Promise<BlogPost[]>;
}

export interface AuthorDirectory {
  listPublishedAuthors(): Promise<Author[]>;
  getPublishedAuthor(id: string): Promise<Author | null>;
  getAuthorArchive(id: string): Promise<AuthorArchive | null>;
}

export function createAuthorDirectory(deps: AuthorDirectoryDeps): AuthorDirectory {
  /**
   * Public author reads are best-effort for lists: a storage outage degrades
   * to an empty directory and is logged, rather than failing the render or
   * returning a 500 to a reader.
   */
  async function readProfiles(slug?: string): Promise<ProfileRow[]> {
    try {
      return await deps.listProfiles(slug);
    } catch (error) {
      console.error('Could not load author profiles:', error);
      return [];
    }
  }

  /**
   * Every published profile, alphabetically, with a real article count filled
   * in from one catalogue read shared by every author on the page.
   */
  async function listPublishedAuthors(): Promise<Author[]> {
    const [profiles, catalogue] = await Promise.all([readProfiles(), deps.listCatalogue()]);

    const counts = new Map<string, number>();
    for (const article of catalogue) {
      counts.set(article.author.id, (counts.get(article.author.id) ?? 0) + 1);
    }

    return profiles.map((profile) => {
      const author = profileToAuthor(profile);
      return { ...author, articleCount: counts.get(author.id) ?? 0 };
    });
  }

  /**
   * One published profile, or null when no such profile exists.
   *
   * Deliberately does NOT degrade: null means the author genuinely is not
   * published, anything else throws, so a transient outage surfaces as a 5xx
   * rather than a 404 a crawler would treat as "gone".
   *
   * Case-insensitive on the slug so an old link to /author/Maya-Lin resolves.
   */
  async function getPublishedAuthor(id: string): Promise<Author | null> {
    if (!id) return null;
    const wanted = id.trim().toLowerCase();
    const profiles = await deps.listProfiles();
    const match = profiles.find((profile) => profile.slug.toLowerCase() === wanted);
    return match ? profileToAuthor(match) : null;
  }

  /** A published profile plus the published articles attributed to it. */
  async function getAuthorArchive(id: string): Promise<AuthorArchive | null> {
    const author = await getPublishedAuthor(id);
    if (!author) return null;

    const articles = (await deps.listCatalogue()).filter(
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
  }

  return { listPublishedAuthors, getPublishedAuthor, getAuthorArchive };
}
