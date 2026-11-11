/**
 * Freezes the observable HTTP contract of the current Next.js application so the
 * Pages migration can be checked against it later (see docs/superpowers/plans/
 * 2026-11-10-react-vite-pages-migration.md, Task 1).
 *
 * Two independent exports:
 *
 *   collectNextApiMethods(root)  — static inventory of the route handlers under
 *     `app/api`. Used by test/contracts/baseline.test.ts; must match the
 *     checked-in fixture exactly.
 *
 *   captureNextContract(base)    — live capture of a curated, deterministic set
 *     of requests against an already-running Next server. Used to record
 *     BaselineContract into test/fixtures/next-http-contract.json. This is a
 *     documentation fixture, not a CI assertion: it normalizes variable
 *     timestamps, records only an allow-listed set of headers and never sends
 *     cookies or mutations (the capture server runs in isolated local demo
 *     mode).
 *
 * CLI:
 *
 *     BASE_URL=http://127.0.0.1:3000 npx tsx scripts/capture-next-contract.ts --out test/fixtures/next-http-contract.json
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface ApiMethodEntry {
  /** Route path with dynamic segments templated, e.g. /api/articles/{id}. */
  path: string;
  method: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;
const METHOD_PATTERN = new RegExp(
  `export\\s+(?:async\\s+)?function\\s+(${HTTP_METHODS.join('|')})\\b`,
  'g',
);

/** Recursively collects exported HTTP method handlers from `root` (e.g. app/api). */
export function collectNextApiMethods(root: string): ApiMethodEntry[] {
  const entries: ApiMethodEntry[] = [];
  const stack: string[] = [root];

  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (name !== 'route.ts' && name !== 'route.tsx') continue;

      const relative = path.relative(root, path.dirname(full)).split(path.sep).filter(Boolean);
      const segments = relative.map((segment) => {
        const dynamic = /^\[(.+)\]$/.exec(segment);
        return dynamic ? `{${dynamic[1]}}` : segment;
      });
      const routePath = ['api', ...segments].join('/');

      const seen = new Set<string>();
      for (const match of readFileSync(full, 'utf8').matchAll(METHOD_PATTERN)) {
        const method = match[1];
        if (seen.has(method)) continue;
        seen.add(method);
        entries.push({ path: `/${routePath}`, method });
      }
    }
  }

  entries.sort((a, b) =>
    a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
  );
  return entries;
}

export interface BaselineResponseEntry {
  path: string;
  method: string;
  status: number;
  /** Allow-listed, lower-cased response headers. */
  headers: Record<string, string>;
  /** <title> contents for HTML responses, otherwise null. */
  title: string | null;
  /** Canonical link target for HTML responses, otherwise null. */
  canonical: string | null;
  /** Parsed, timestamp-normalized JSON body, otherwise null. */
  json: JsonValue | null;
}

export interface BaselineContract {
  responses: BaselineResponseEntry[];
}

/** The only headers worth freezing; everything else is environment-specific. */
const HEADER_ALLOWLIST = new Set([
  'content-type',
  'cache-control',
  'link',
  'location',
  'allow',
  'x-robots-tag',
]);

function captureHeaders(headers: Headers): Record<string, string> {
  const captured: Record<string, string> = {};
  for (const [key, value] of headers) {
    const lower = key.toLowerCase();
    if (HEADER_ALLOWLIST.has(lower)) captured[lower] = value;
  }
  return captured;
}

const ISO_TIMESTAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})/g;

/** Replaces wall-clock timestamps so the fixture is stable across runs. */
export function normalizeJson(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.replace(ISO_TIMESTAMP, '<timestamp>');
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (typeof value === 'object') {
    const out: { [key: string]: JsonValue } = {};
    for (const [key, entry] of Object.entries(value)) out[key] = normalizeJson(entry);
    return out;
  }
  return String(value);
}

const HTML_TITLE = /<title>([^<]*)<\/title>/i;
const HTML_CANONICAL = /<link\b[^>]*\brel=["']canonical["'][^>]*>/i;
const CANONICAL_HREF = /\bhref=["']([^"']+)["']/i;

function htmlMetadata(text: string): { title: string | null; canonical: string | null } {
  const title = HTML_TITLE.exec(text)?.[1]?.trim() ?? null;
  const tag = HTML_CANONICAL.exec(text)?.[0];
  const canonical = (tag && CANONICAL_HREF.exec(tag)?.[1]) ?? null;
  return { title, canonical };
}

interface CaptureEntry {
  path: string;
  method?: 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Deterministic capture list: seeded pages and APIs, special resources,
 * malformed input, unauthenticated/failing writes and HEAD/OPTIONS behavior.
 * Successful writes are deliberately excluded so the fixture never depends on
 * or mutates local state beyond what read requests already do.
 */
const CAPTURE_ENTRIES: CaptureEntry[] = [
  { path: '/' },
  { path: '/category/data-policy' },
  { path: '/?category=Data%20%26%20Policy' },
  { path: '/post/inside-vllm-and-paged-attention' },
  { path: '/post/no-such-post' },
  { path: '/papers' },
  { path: '/paper/no-such-paper' },
  { path: '/authors' },
  { path: '/author/maya-lin' },
  { path: '/author/no-such-author' },
  { path: '/editions' },
  { path: '/editorial-board' },
  { path: '/assistant' },
  { path: '/bookmarks' },
  { path: '/cite' },
  { path: '/api-docs' },
  { path: '/login' },
  { path: '/write' },
  { path: '/dashboard' },
  { path: '/dashboard/access' },
  { path: '/dashboard/manage' },
  { path: '/dashboard/comments' },
  { path: '/dashboard/applications' },
  { path: '/robots.txt' },
  { path: '/sitemap.xml' },
  { path: '/manifest.webmanifest' },
  { path: '/icon.svg' },
  { path: '/icon.png' },
  { path: '/apple-icon' },
  { path: '/opengraph-image' },
  { path: '/post/inside-vllm-and-paged-attention/opengraph-image' },
  { path: '/paper/no-such-paper/opengraph-image' },
  { path: '/.well-known/api-catalog' },
  { path: '/.well-known/api-catalog', method: 'HEAD' },
  { path: '/openapi.json' },
  { path: '/api/articles' },
  { path: '/api/articles', method: 'HEAD' },
  { path: '/api/articles', method: 'OPTIONS' },
  { path: '/api/articles?limit=2' },
  { path: '/api/articles?category=Research%20Reviews' },
  { path: '/api/articles?search=vllm' },
  { path: '/api/articles?author=maya-lin' },
  { path: '/api/articles/post-1' },
  { path: '/api/articles/no-such-id' },
  { path: '/api/authors' },
  { path: '/api/authors/maya-lin' },
  { path: '/api/authors/no-such-author' },
  { path: '/api/papers' },
  { path: '/api/papers?topic=AI%20Infrastructure' },
  { path: '/api/papers/no-such-paper' },
  { path: '/api/comments' },
  { path: '/api/comments?postId=post-1' },
  { path: '/api/cms/posts' },
  { path: '/api/cms/comments' },
  { path: '/api/cms/posts/1' },
  { path: '/api/dashboard/applications' },
  {
    path: '/api/comments',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'not json at all',
  },
  {
    path: '/api/comments',
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'plain text',
  },
  { path: '/api/revalidate', method: 'POST' },
  {
    path: '/api/revalidate',
    method: 'POST',
    headers: { 'x-revalidate-secret': 'definitely-wrong' },
    body: '{}',
  },
  {
    path: '/api/cms/posts',
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'plain text',
  },
];

export async function captureNextContract(base: URL): Promise<BaselineContract> {
  const responses: BaselineResponseEntry[] = [];

  for (const entry of CAPTURE_ENTRIES) {
    const method = entry.method ?? 'GET';
    const url = new URL(entry.path, base);
    const response = await fetch(url, {
      method,
      headers: entry.headers,
      body: entry.body,
      redirect: 'manual',
    });

    const contentType = response.headers.get('content-type') ?? '';
    let title: string | null = null;
    let canonical: string | null = null;
    let json: JsonValue | null = null;

    if (contentType.includes('text/html')) {
      const text = await response.text();
      ({ title, canonical } = htmlMetadata(text));
    } else if (contentType.includes('json')) {
      try {
        json = normalizeJson(await response.json());
      } catch {
        json = null;
      }
    } else {
      // Drain the body so the socket can be reused.
      await response.arrayBuffer().catch(() => undefined);
    }

    responses.push({
      path: entry.path,
      method,
      status: response.status,
      headers: captureHeaders(response.headers),
      title,
      canonical,
      json,
    });
  }

  return { responses };
}

async function main() {
  const outIndex = process.argv.indexOf('--out');
  const out = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;
  if (!out) {
    console.error('Usage: npx tsx scripts/capture-next-contract.ts --out <file.json> [--root app/api] [--list]');
    process.exit(1);
  }

  if (process.argv.includes('--list')) {
    console.log(JSON.stringify(collectNextApiMethods('app/api'), null, 2));
    return;
  }

  const base = new URL(process.env.BASE_URL ?? 'http://127.0.0.1:3000');
  console.log(`Capturing ${CAPTURE_ENTRIES.length} requests from ${base.origin} ...`);
  const contract = await captureNextContract(base);
  writeFileSync(out, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${contract.responses.length} responses to ${out}`);
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsScript) {
  main().catch((error) => {
    console.error('Failed to capture the Next.js contract:', error);
    process.exit(1);
  });
}
