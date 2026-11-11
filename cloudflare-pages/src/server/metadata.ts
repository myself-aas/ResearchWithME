/**
 * Minimal page metadata for the SSR document (Task 10).
 *
 * Task 14A/14B expand this into the full SEO surface (per-route titles,
 * Open Graph/Twitter cards, JSON-LD, canonical alternates). Everything here
 * is transport-safe: values are attribute-escaped before they reach the
 * document, and callers must treat every input as untrusted.
 */
import type { RequestContext } from './context';

export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  type: 'website' | 'article';
}

const DEFAULT_TITLE = 'ResearchWithMe · Applied AI research, published openly';
const DEFAULT_DESCRIPTION =
  'ResearchWithMe is an independent, editorially reviewed journal for applied AI research — papers, reviews and analysis, published openly.';

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface PageMetadataOverrides {
  title?: string;
  description?: string;
  type?: 'website' | 'article';
  /** Canonical path override, e.g. `/author/maya-lin` when the request used a legacy casing. */
  path?: string;
}

const MAX_METADATA_LENGTH = 300;
const MAX_CANONICAL_LENGTH = 400;

function cleanText(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_METADATA_LENGTH);
}

function cleanPath(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  // Only same-origin absolute paths may override the canonical.
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return undefined;
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed)) return undefined;
  return trimmed.slice(0, MAX_CANONICAL_LENGTH);
}

/**
 * The minimal, always-valid metadata the document shell can emit. Route
 * loaders may override the title/description/type (and normalise the
 * canonical path) via `overrides` — the values are treated as untrusted
 * text: whitespace is collapsed, control characters rejected for paths,
 * and every attribute is escaped at render time.
 */
export function pageMetadata(ctx: RequestContext, overrides: PageMetadataOverrides = {}): PageMetadata {
  const siteUrl = ctx.config.siteUrl.replace(/\/+$/, '');
  const pathname = new URL(ctx.request.url).pathname;
  const canonicalPath =
    cleanPath(overrides.path) ?? (pathname === '/' ? '/' : pathname);
  return {
    title: cleanText(overrides.title) ?? DEFAULT_TITLE,
    description: cleanText(overrides.description) ?? DEFAULT_DESCRIPTION,
    canonical: `${siteUrl}${canonicalPath}`,
    robots: 'index, follow',
    type: overrides.type === 'article' ? 'article' : 'website',
  };
}

export function renderMetadataTags(meta: PageMetadata): string {
  const title = escapeHtmlAttribute(meta.title);
  const description = escapeHtmlAttribute(meta.description);
  const canonical = escapeHtmlAttribute(meta.canonical);
  const robots = escapeHtmlAttribute(meta.robots);
  const ogType = escapeHtmlAttribute(meta.type);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<meta name="robots" content="${robots}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:site_name" content="ResearchWithMe">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
  ].join('');
}
