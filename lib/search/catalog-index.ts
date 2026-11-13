import Fuse from 'fuse.js';
import type { Author, BlogPost } from '@/lib/blog-data';

export type CatalogEntityKind = 'article' | 'specialist' | 'route';

export interface CatalogSearchItem {
  id: string;
  kind: CatalogEntityKind;
  title: string;
  subtitle: string;
  href: string;
  identifiers: string[];
  tags: string[];
  specialistName?: string;
  verifiedVia?: 'orcid' | 'github';
  category?: string;
  format?: string;
}

export function normalizeIdentifierQuery(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^https?:\/\/(www\.)?orcid\.org\//i, '')
    .replace(/^orcid:\s*/i, '')
    .replace(/^@+/, '')
    .replace(/[.,;)\]]+$/, '')
    .trim()
    .toLowerCase();
}

const CORE_ROUTES: CatalogSearchItem[] = [
  {
    id: 'route-index',
    kind: 'route',
    title: 'Articles',
    subtitle: 'Full catalogue filtered by topic and format',
    href: '/',
    identifiers: ['index', 'articles'],
    tags: ['catalog', 'articles'],
  },
  {
    id: 'route-authors',
    kind: 'route',
    title: 'Writers',
    subtitle: 'Approved writers with linked ORCID and GitHub identities',
    href: '/authors',
    identifiers: ['authors', 'writers', 'orcid', 'github'],
    tags: ['writers'],
  },
  {
    id: 'route-assistant',
    kind: 'route',
    title: 'Assistant',
    subtitle: 'Citation-grounded research synthesis across published works',
    href: '/assistant',
    identifiers: ['assistant'],
    tags: ['rag', 'citations', 'literature'],
  },
  {
    id: 'route-bookmarks',
    kind: 'route',
    title: 'Reading List — Saved Articles',
    subtitle: 'Locally persisted articles queued for focused study',
    href: '/bookmarks',
    identifiers: ['bookmarks', 'reading-list', 'saved'],
    tags: ['saved', 'bookmarks'],
  },
  {
    id: 'route-cite',
    kind: 'route',
    title: 'Citation Generator',
    subtitle: 'Export BibTeX, APA, RIS & CSL-JSON records for catalog entries',
    href: '/cite',
    identifiers: ['cite', 'bibtex', 'apa', 'ris'],
    tags: ['citation', 'bibtex', 'apa'],
  },
];

function collectIdentifiers(rawList: Array<string | undefined | null>): string[] {
  const out = new Set<string>();
  for (const raw of rawList) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    out.add(trimmed);
    const normalized = normalizeIdentifierQuery(trimmed);
    if (normalized) out.add(normalized);
  }
  return Array.from(out);
}

export function buildCatalogIndex(input: {
  articles: BlogPost[];
  authors: Author[];
}): CatalogSearchItem[] {
  const items: CatalogSearchItem[] = [];
  const seenSpecialistKeys = new Set<string>();

  for (const post of input.articles) {
    const identifiers = collectIdentifiers([
      post.id,
      post.slug,
      post.reviewedArtifact?.identifier,
      post.reviewedArtifact?.url,
    ]);
    items.push({
      id: `article-${post.id}`,
      kind: 'article',
      title: post.title,
      subtitle: `${post.author.name} · ${post.category} · ${post.readTime}`,
      href: `/post/${post.slug}`,
      identifiers,
      tags: [...(post.tags ?? []), post.category, post.format],
      specialistName: post.author.name,
      verifiedVia: post.author.verifiedVia,
      category: post.category,
      format: post.format,
    });
  }

  for (const author of input.authors) {
    const key = author.id || normalizeIdentifierQuery(author.name);
    if (!key || seenSpecialistKeys.has(key)) continue;
    seenSpecialistKeys.add(key);

    const handleToken = author.verifiedIdentifier?.split(/\s+/)[0];
    const identifiers = collectIdentifiers([
      author.orcid,
      author.github,
      handleToken,
      author.id,
    ]);
    items.push({
      id: `specialist-${author.id}`,
      kind: 'specialist',
      title: author.name,
      subtitle: `${author.role}${author.institution ? ` · ${author.institution}` : ''}`,
      href: `/author/${author.id}`,
      identifiers,
      tags: [author.domain, author.role, author.institution ?? ''].filter(Boolean),
      specialistName: author.name,
      verifiedVia: author.verifiedVia,
    });
  }

  items.push(...CORE_ROUTES);
  return items;
}

export function searchCatalog(
  query: string,
  items: CatalogSearchItem[],
  limit = 20,
): CatalogSearchItem[] {
  const trimmed = query.trim();
  if (!trimmed) {
    const featuredArticles = items.filter((item) => item.kind === 'article').slice(0, 6);
    const featuredSpecialists = items.filter((item) => item.kind === 'specialist').slice(0, 4);
    const routes = items.filter((item) => item.kind === 'route').slice(0, 5);
    return [...featuredArticles, ...featuredSpecialists, ...routes].slice(0, limit);
  }

  const norm = normalizeIdentifierQuery(trimmed);
  const exactMatches: CatalogSearchItem[] = [];
  const prefixMatches: CatalogSearchItem[] = [];
  const seen = new Set<string>();

  if (norm.length >= 2) {
    for (const item of items) {
      const normalizedItemIds = item.identifiers.map((identifier) =>
        normalizeIdentifierQuery(identifier),
      );
      if (normalizedItemIds.some((id) => id === norm)) {
        exactMatches.push(item);
        seen.add(item.id);
      } else if (
        norm.length >= 4 &&
        normalizedItemIds.some((id) => id.startsWith(norm) || id.includes(norm))
      ) {
        prefixMatches.push(item);
        seen.add(item.id);
      }
    }
  }

  const fuse = new Fuse(items, {
    keys: [
      { name: 'title', weight: 0.35 },
      { name: 'identifiers', weight: 0.3 },
      { name: 'tags', weight: 0.15 },
      { name: 'specialistName', weight: 0.12 },
      { name: 'subtitle', weight: 0.08 },
    ],
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const fuzzyResults = fuse.search(trimmed);
  const combined = [...exactMatches, ...prefixMatches];

  for (const hit of fuzzyResults) {
    if (!seen.has(hit.item.id)) {
      seen.add(hit.item.id);
      combined.push(hit.item);
    }
    if (combined.length >= limit) break;
  }

  return combined.slice(0, limit);
}
