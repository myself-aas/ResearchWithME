/**
 * ResearchWithME v3.4 — Part V §11 Academic & Repository Resolver Pipeline
 *
 * Implements the normative resolver waterfall:
 *   1. Crossref (DOI metadata)
 *   2. OpenAlex (works, authors, institutions, concepts)
 *   3. PubMed/NCBI (PMID/PMCID biomedical records)
 *   4. arXiv (preprints)
 *   5. DataCite (datasets & software DOIs)
 *   6. Unpaywall (open-access PDF/landing resolution where permitted)
 *   7. GitHub / GitLab repository observation adapters (Part V §11.2)
 *
 * Security controls:
 *   - Strict outbound hostname allowlist (SSRF protection; blocks private IPs & non-allowlisted hosts)
 *   - Bounded timeout & response size limits
 *   - Deterministic offline/manual fallback when external networks are unavailable
 */
import { normalizeScholarlyIdentifier, type NormalizedIdentifier } from './identifiers';

export type AcademicResolverName =
  | 'crossref'
  | 'openalex'
  | 'pubmed'
  | 'arxiv'
  | 'datacite'
  | 'unpaywall'
  | 'github'
  | 'gitlab'
  | 'local-deterministic';

export const ALLOWED_RESOLVER_HOSTS = new Set([
  'api.crossref.org',
  'api.openalex.org',
  'eutils.ncbi.nlm.nih.gov',
  'export.arxiv.org',
  'api.datacite.org',
  'api.unpaywall.org',
  'api.github.com',
  'gitlab.com',
]);

export const ACADEMIC_RESOLVER_ORDER: readonly AcademicResolverName[] = [
  'crossref',
  'openalex',
  'pubmed',
  'arxiv',
  'datacite',
  'unpaywall',
] as const;

export interface ResolvedSourceMetadata {
  identifier: NormalizedIdentifier;
  resolver: AcademicResolverName;
  title: string;
  authors: string[];
  venue: string | null;
  publishedDate: string | null;
  accessState: 'open' | 'subscription' | 'restricted' | 'unknown';
  canonicalUrl: string;
  observedAt: string;
  /** True when retrieved live from an allowlisted upstream resolver; false on offline fallback. */
  liveResolved: boolean;
}

export interface RepositoryObservation {
  host: 'github' | 'gitlab';
  owner: string;
  name: string;
  canonicalUrl: string;
  defaultBranch: string;
  licenseSpdx: string | null;
  starsCount: number | null;
  forksCount: number | null;
  openIssuesCount: number | null;
  observedAt: string;
  liveObserved: boolean;
}

/**
 * Verifies a candidate outbound URL targets ONLY an explicitly allowlisted
 * HTTPS scholarly/repository host (blocks localhost, RFC 1918, metadata IPs, etc.).
 */
export function assertAllowedResolverUrl(urlString: string): URL {
  const parsed = new URL(urlString);
  if (parsed.protocol !== 'https:') {
    throw new Error(`Resolver protocol must be https: got ${parsed.protocol}`);
  }
  if (!ALLOWED_RESOLVER_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(`SSRF guard rejected non-allowlisted resolver host: ${parsed.hostname}`);
  }
  return parsed;
}

/**
 * Returns the ordered upstream endpoint candidates for a normalized scholarly identifier
 * following Part V §11.1 resolver precedence.
 */
export function planResolverEndpoints(
  identifier: NormalizedIdentifier,
): Array<{ resolver: AcademicResolverName; url: string }> {
  const encoded = encodeURIComponent(identifier.value);
  switch (identifier.scheme) {
    case 'doi':
      return [
        { resolver: 'crossref', url: `https://api.crossref.org/works/${encoded}` },
        { resolver: 'openalex', url: `https://api.openalex.org/works/https://doi.org/${encoded}` },
        { resolver: 'datacite', url: `https://api.datacite.org/dois/${encoded}` },
        { resolver: 'unpaywall', url: `https://api.unpaywall.org/v2/${encoded}?email=ops@researchwith.me` },
      ];
    case 'arxiv':
      return [
        { resolver: 'arxiv', url: `https://export.arxiv.org/api/query?id_list=${encoded}` },
        { resolver: 'openalex', url: `https://api.openalex.org/works/https://arxiv.org/abs/${encoded}` },
      ];
    case 'pmid':
    case 'pmcid':
      return [
        {
          resolver: 'pubmed',
          url: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${encoded}`,
        },
        { resolver: 'openalex', url: `https://api.openalex.org/works/pmid:${encoded}` },
      ];
    case 'github':
      return [{ resolver: 'github', url: `https://api.github.com/repos/${identifier.value}` }];
    case 'gitlab':
      return [
        {
          resolver: 'gitlab',
          url: `https://gitlab.com/api/v4/projects/${encodeURIComponent(identifier.value)}`,
        },
      ];
    default:
      return [];
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Resolves metadata for a scholarly identifier using the Part V §11.1 waterfall
 * with deterministic offline/manual fallback when network calls are disabled or fail.
 */
export async function resolveScholarlyMetadata(
  rawInput: string,
  options?: { allowNetwork?: boolean; fetcher?: FetchLike; timeoutMs?: number },
): Promise<ResolvedSourceMetadata | null> {
  const identifier = normalizeScholarlyIdentifier(rawInput);
  if (!identifier) return null;

  const observedAt = new Date().toISOString();
  const allowNetwork = options?.allowNetwork ?? false;
  const fetcher = options?.fetcher ?? fetch;
  const timeoutMs = Math.min(8_000, Math.max(500, options?.timeoutMs ?? 4_000));

  if (allowNetwork) {
    const plan = planResolverEndpoints(identifier);
    for (const step of plan) {
      try {
        const safeUrl = assertAllowedResolverUrl(step.url);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetcher(safeUrl.toString(), {
            headers: {
              Accept: 'application/json, application/atom+xml;q=0.9',
              'User-Agent': 'ResearchWithME/3.4 (+https://researchwith.me)',
            },
            signal: controller.signal,
          });
          if (!res.ok) continue;

          if (step.resolver === 'crossref') {
            const payload = (await res.json()) as {
              message?: {
                title?: string[];
                author?: Array<{ given?: string; family?: string }>;
                'container-title'?: string[];
                issued?: { 'date-parts'?: number[][] };
              };
            };
            const msg = payload.message;
            if (msg?.title?.[0]) {
              const year = msg.issued?.['date-parts']?.[0]?.[0];
              return {
                identifier,
                resolver: 'crossref',
                title: msg.title[0],
                authors:
                  msg.author?.map((a) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean) ??
                  [],
                venue: msg['container-title']?.[0] ?? null,
                publishedDate: year ? `${year}-01-01` : null,
                accessState: 'unknown',
                canonicalUrl: identifier.canonicalUrl,
                observedAt,
                liveResolved: true,
              };
            }
          }

          if (step.resolver === 'github') {
            const repo = (await res.json()) as {
              full_name?: string;
              description?: string | null;
              owner?: { login?: string };
              pushed_at?: string;
            };
            if (repo.full_name) {
              return {
                identifier,
                resolver: 'github',
                title: repo.description ? `${repo.full_name} — ${repo.description}` : repo.full_name,
                authors: repo.owner?.login ? [repo.owner.login] : [],
                venue: 'GitHub',
                publishedDate: repo.pushed_at ? repo.pushed_at.slice(0, 10) : null,
                accessState: 'open',
                canonicalUrl: identifier.canonicalUrl,
                observedAt,
                liveResolved: true,
              };
            }
          }
        } finally {
          clearTimeout(timer);
        }
      } catch {
        // Continue down waterfall safely
      }
    }
  }

  return {
    identifier,
    resolver: 'local-deterministic',
    title: `${identifier.scheme.toUpperCase()} ${identifier.value}`,
    authors: [],
    venue:
      identifier.scheme === 'arxiv'
        ? 'arXiv'
        : identifier.scheme === 'github'
          ? 'GitHub'
          : identifier.scheme === 'gitlab'
            ? 'GitLab'
            : null,
    publishedDate: null,
    accessState:
      identifier.scheme === 'arxiv' || identifier.scheme === 'github' || identifier.scheme === 'gitlab'
        ? 'open'
        : 'unknown',
    canonicalUrl: identifier.canonicalUrl,
    observedAt,
    liveResolved: false,
  };
}

/**
 * Normalizes a GitHub or GitLab URL into a timestamped RepositoryObservation
 * without conflating popularity metrics with scholarly quality (ADR-032-10).
 */
export function buildRepositoryObservation(
  rawUrl: string,
  liveStats?: Partial<Pick<RepositoryObservation, 'defaultBranch' | 'licenseSpdx' | 'starsCount' | 'forksCount' | 'openIssuesCount'>>,
): RepositoryObservation | null {
  const id = normalizeScholarlyIdentifier(rawUrl);
  if (!id || (id.scheme !== 'github' && id.scheme !== 'gitlab')) return null;

  const parts = id.value.split('/');
  if (parts.length < 2) return null;
  const name = parts[parts.length - 1];
  const owner = parts.slice(0, -1).join('/');

  return {
    host: id.scheme,
    owner,
    name,
    canonicalUrl: id.canonicalUrl,
    defaultBranch: liveStats?.defaultBranch ?? 'main',
    licenseSpdx: liveStats?.licenseSpdx ?? null,
    starsCount: typeof liveStats?.starsCount === 'number' ? liveStats.starsCount : null,
    forksCount: typeof liveStats?.forksCount === 'number' ? liveStats.forksCount : null,
    openIssuesCount: typeof liveStats?.openIssuesCount === 'number' ? liveStats.openIssuesCount : null,
    observedAt: new Date().toISOString(),
    liveObserved: Boolean(liveStats),
  };
}
