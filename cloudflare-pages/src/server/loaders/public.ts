/**
 * Public reader loaders (`/`, `/category/:slug`, `/post/:slug`,
 * `/paper/:slug`, `/author/:id`).
 *
 * The Next app resolves these in async server components; the Pages target
 * resolves them here, once per request, and hands the data to the route
 * components through the React Router data layer. Semantics preserved from
 * the Next routes:
 *
 *   - seed/CMS precedence (live CMS rows lead, durable legacy corpus follows,
 *     bundled seeds are the last-ditch fallback) via getPublicArticleCatalogue
 *   - the `/?category=…` canonical redirect to clean category URLs
 *   - true 404s for unknown post/paper/author slugs (a genuinely missing
 *     record), and 5xx for a Supabase outage — never a de-indexing 404
 *   - untrusted strings (article titles, bios, abstracts) cross only as
 *     JSON-safe values; the document renderer escapes them at the HTML edge
 *
 * Failure shape: loaders THROW `Response`s for public HTTP outcomes
 * (redirects, 404s) and plain Errors for unexpected failures — React Router
 * maps thrown Responses onto the error boundary with their status intact,
 * and `serializeRouteError` collapses plain Errors to a generic 500.
 */
import { redirect } from 'react-router-dom';
import type { RequestContext } from '../context';
import { getPublicArticleCatalogue } from '../stores';
import { directoryFor } from '../directory';
import { CATEGORY_META } from '@/components/ArticleFeed';
import { categoryToSlug, slugToCategory } from '@/lib/blog-data';
import {
  stripForFeed,
  type CategoryLoaderData,
  type HomeLoaderData,
  type PaperLoaderData,
  type PostLoaderData,
  type AuthorLoaderData,
  type PapersLoaderData,
  type AuthorsLoaderData,
  type StaticArchiveLoaderData,
  type ReaderToolLoaderData,
  type RouteMetadata,
} from '../../routes/data';

const MAX_PARAM_LENGTH = 300;
const MAX_SEARCH_LENGTH = 200;

function cleanParam(value: string | undefined): string {
  return (value ?? '').trim().slice(0, MAX_PARAM_LENGTH);
}

function cleanSearch(url: URL): string {
  const raw = url.searchParams.get('search');
  return typeof raw === 'string' ? raw.slice(0, MAX_SEARCH_LENGTH) : '';
}

function notFound(message: string): Response {
  return new Response(message, { status: 404, statusText: 'Not Found' });
}

/** Home feed: canonicalises legacy `?category=` links before anything renders. */
async function loadHome(ctx: RequestContext): Promise<HomeLoaderData> {
  const url = new URL(ctx.request.url);
  const rawCategory = url.searchParams.get('category');
  const search = cleanSearch(url);

  // Canonicalize legacy category query params (e.g. ?category=Data%20%26%20Policy)
  // to clean URLs (/category/data-policy) — same rule as app/page.tsx.
  if (rawCategory && rawCategory !== 'All') {
    const matchedCategory = slugToCategory(rawCategory);
    if (matchedCategory) {
      const searchSuffix = search ? `?search=${encodeURIComponent(search)}` : '';
      throw redirect(`/category/${categoryToSlug(matchedCategory)}${searchSuffix}`);
    }
  }

  const [authors, articles] = await Promise.all([
    directoryFor(ctx).listPublishedAuthors(),
    getPublicArticleCatalogue(ctx),
  ]);

  return {
    kind: 'home',
    category: 'All',
    search,
    authors,
    posts: articles.map(stripForFeed),
  };
}

async function loadCategory(
  ctx: RequestContext,
  params: Record<string, string | undefined>,
): Promise<CategoryLoaderData> {
  const url = new URL(ctx.request.url);
  const search = cleanSearch(url);
  const category = slugToCategory(cleanParam(params.slug));
  if (!category) throw notFound('Field not found.');

  const meta = CATEGORY_META[category];
  const slug = categoryToSlug(category);
  const metadata: RouteMetadata = {
    title: `${category} Reviews & Teardowns`,
    description:
      meta?.description ??
      `Open-access scholarly paper reviews and repository teardowns in ${category}.`,
    type: 'website',
    path: `/category/${slug}`,
  };

  const [authors, articles] = await Promise.all([
    directoryFor(ctx).listPublishedAuthors(),
    getPublicArticleCatalogue(ctx),
  ]);

  return {
    kind: 'category',
    category,
    search,
    authors,
    posts: articles.map(stripForFeed),
    metadata,
  };
}

async function loadPost(
  ctx: RequestContext,
  params: Record<string, string | undefined>,
): Promise<PostLoaderData> {
  const requested = cleanParam(params.slug);
  const articles = await getPublicArticleCatalogue(ctx);
  const article = articles.find((candidate) => candidate.slug === requested || candidate.id === requested);
  // Resolve the miss BEFORE the document starts streaming: the boundary must
  // render with a real 404 status, never a soft-404 shell served as 200.
  if (!article) throw notFound('Article not found.');

  const related = articles
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => ({
      candidate,
      score:
        (candidate.category === article.category ? 2 : 0) +
        candidate.tags.filter((tag) => article.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => stripForFeed(entry.candidate));

  const metadata: RouteMetadata = {
    title: article.title,
    description: article.summary,
    type: 'article',
    path: `/post/${article.slug}`,
  };

  return { kind: 'post', article, related, metadata };
}

function loadPaper(
  ctx: RequestContext,
  params: Record<string, string | undefined>,
): PaperLoaderData {
  const requested = cleanParam(params.slug);
  // app/paper/[slug]/page.tsx parity: slug or id (never doi — the doi path was
  // an API convenience, not a page route).
  const paper = ctx.services
    .listPapers()
    .find((candidate) => candidate.slug === requested || candidate.id === requested);
  if (!paper) throw notFound('Paper not found.');

  const metadata: RouteMetadata = {
    title: paper.title,
    description: paper.abstract,
    type: 'article',
    path: `/paper/${paper.slug}`,
  };

  return { kind: 'paper', paper, metadata };
}

async function loadAuthor(
  ctx: RequestContext,
  params: Record<string, string | undefined>,
): Promise<AuthorLoaderData> {
  const requested = cleanParam(params.id);
  // directoryFor throws on a Supabase outage: the boundary renders a 5xx
  // rather than de-indexing a valid author with a 404. A null archive means
  // the profile genuinely is not published.
  const archive = await directoryFor(ctx).getAuthorArchive(requested);
  if (!archive) throw notFound('Author not found.');

  const { author, articles, metrics } = archive;
  const metadata: RouteMetadata = {
    title: `${author.name} — ResearchWithMe`,
    description:
      author.bio ||
      `Peer reviews and teardowns by ${author.name}${author.institution ? ` at ${author.institution}` : ''} on ResearchWithMe.`,
    type: 'website',
    path: `/author/${author.id}`,
  };

  return {
    kind: 'author',
    author,
    articles: articles.map(stripForFeed),
    metrics,
    metadata,
  };
}

const PAPERS_METADATA: RouteMetadata = {
  title: 'Papers — ResearchWithMe',
  description:
    'A structured archive of open-access papers: each record lists its authors, DOI, license, methods, findings, and reproducibility material.',
  type: 'website',
  path: '/papers',
};

const AUTHORS_METADATA: RouteMetadata = {
  title: 'Contributors — ResearchWithMe',
  description:
    'The reviewers behind the archive: their research domains, institutions, and complete publication records.',
  type: 'website',
  path: '/authors',
};

const ASSISTANT_METADATA: RouteMetadata = {
  title: 'Ask the archive — ResearchWithMe',
  description:
    "The assistant answers from this platform's own catalog and cites its sources; without a configured model key it returns a deterministic, cited summary.",
  type: 'website',
  path: '/assistant',
};

const BOOKMARKS_METADATA: RouteMetadata = {
  title: 'Your reading list — ResearchWithMe',
  description: 'Saved reviews and teardowns, kept on this device and exportable at any time.',
  type: 'website',
  path: '/bookmarks',
};

const API_DOCS_METADATA: RouteMetadata = {
  title: 'API reference — ResearchWithMe',
  description: 'Reference for the ResearchWithMe archive, assistant, and editorial HTTP APIs.',
  type: 'website',
  path: '/api-docs',
};

const CITE_METADATA: RouteMetadata = {
  title: 'Build a citation — ResearchWithMe',
  description:
    'Copy a formatted citation for LaTeX, Zotero, Mendeley, EndNote, or a reference list. Every format uses the same verified metadata.',
  type: 'website',
  path: '/cite',
};

const EDITIONS_METADATA: RouteMetadata = {
  title: 'Quarterly editions — ResearchWithMe',
  description:
    "Thematic compendiums that gather a quarter's reviews, methods, and corrections into one printable volume.",
  type: 'website',
  path: '/editions',
};

const EDITORIAL_BOARD_METADATA: RouteMetadata = {
  title: 'Editorial board — ResearchWithMe',
  description:
    'The independent collective of researchers, systems engineers, clinicians, and data librarians who set the review standard.',
  type: 'website',
  path: '/editorial-board',
};

/**
 * Papers archive: the shared component renders SSR from the bundled corpus
 * (the production seed is empty) and refreshes from /api/papers on mount.
 */
function loadPapersArchive(ctx: RequestContext): PapersLoaderData {
  return { kind: 'papers', papers: [...ctx.services.listPapers()], metadata: PAPERS_METADATA };
}

/**
 * Contributors directory: published profiles only. The directory core treats
 * public list reads as best-effort (an outage logs and degrades to an empty
 * directory), so this loader does not throw on storage failure.
 */
async function loadAuthorsDirectory(ctx: RequestContext): Promise<AuthorsLoaderData> {
  const authors = await directoryFor(ctx).listPublishedAuthors();
  return { kind: 'authors', authors, metadata: AUTHORS_METADATA };
}

const TOOL_METADATA = {
  assistant: ASSISTANT_METADATA,
  bookmarks: BOOKMARKS_METADATA,
  cite: CITE_METADATA,
  'api-docs': API_DOCS_METADATA,
} as const;

function readerTool(kind: keyof typeof TOOL_METADATA): ReaderToolLoaderData {
  return { kind, metadata: TOOL_METADATA[kind] };
}

function staticArchive(kind: 'editions' | 'editorial-board'): StaticArchiveLoaderData {
  return { kind, metadata: kind === 'editions' ? EDITIONS_METADATA : EDITORIAL_BOARD_METADATA };
}

/**
 * Single entry point the server route table uses. `routeId` is the stable
 * RouteId from the shared route table; `params` come from the matched route.
 * Throws `Response` for public HTTP outcomes (redirect/404) and plain Errors
 * for unexpected failures — see the module docblock.
 */
export async function loadPublicRoute(
  ctx: RequestContext,
  routeId: string,
  params: Record<string, string | undefined>,
): Promise<unknown> {
  switch (routeId) {
    case 'home':
      return loadHome(ctx);
    case 'category':
      return loadCategory(ctx, params);
    case 'post':
      return loadPost(ctx, params);
    case 'paper':
      return loadPaper(ctx, params);
    case 'author':
      return loadAuthor(ctx, params);
    case 'papers':
      return loadPapersArchive(ctx);
    case 'authors':
      return loadAuthorsDirectory(ctx);
    case 'editions':
      return staticArchive('editions');
    case 'editorial-board':
      return staticArchive('editorial-board');
    case 'assistant':
      return readerTool('assistant');
    case 'bookmarks':
      return readerTool('bookmarks');
    case 'cite':
      return readerTool('cite');
    case 'api-docs':
      return readerTool('api-docs');
    default:
      throw new Error(`loadPublicRoute: no public loader registered for route id "${routeId}".`);
  }
}
