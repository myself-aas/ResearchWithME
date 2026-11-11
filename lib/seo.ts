/**
 * Structural subset of Next's `Metadata` covering exactly the fields
 * `pageMetadata` returns. Defined locally so this module (and the Pages
 * SSR runtime) never imports 'next'; Next layouts/pages keep compiling
 * because this shape is assignable to Next's `Metadata` until Task 16.
 */
export interface PageMetadata {
  title: string;
  description: string;
  alternates: { canonical: string };
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    type: 'website' | 'article';
    images: Array<{ url: string; width: number; height: number; alt: string }>;
  };
  twitter: {
    card: 'summary_large_image';
    title: string;
    description: string;
    images: string[];
  };
  robots?: {
    index: boolean;
    follow: boolean;
  };
}

export const SITE_NAME = 'ResearchWithMe';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me').replace(/\/$/, '');
export const SITE_DESCRIPTION =
  'Open-access scholarly essays, reproducible paper reviews, and rigorous repository teardowns from verified domain experts.';

export function absoluteUrl(path = '/') {
  return new URL(path.startsWith('/') ? path : `/${path}`, SITE_URL).toString();
}

export function toDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed;
  const parsed = toDate(trimmed);
  return parsed ? parsed.toISOString().slice(0, 10) : trimmed;
}

export function clampSeoTitle(title: string, maxTotal = 60): string {
  const suffix = ` | ${SITE_NAME}`;
  const budget = Math.max(24, maxTotal - suffix.length);
  if (title.length <= budget) return title;
  const colonIdx = title.indexOf(':');
  if (colonIdx >= 18 && colonIdx <= budget) {
    return title.slice(0, colonIdx);
  }
  const sliced = title.slice(0, budget - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace >= 20 ? sliced.slice(0, lastSpace) : sliced).replace(/[,:;—–-]+$/, '')}…`;
}

export function clampSeoDescription(description: string, minLen = 115, maxLen = 158): string {
  const clean = description.replace(/\s+/g, ' ').trim();
  if (clean.length > maxLen) {
    const sliced = clean.slice(0, maxLen - 1);
    const lastSpace = sliced.lastIndexOf(' ');
    return `${(lastSpace >= 80 ? sliced.slice(0, lastSpace) : sliced).replace(/[,:;—–-]+$/, '')}…`;
  }
  if (clean.length > 0 && clean.length < minLen) {
    const suffix = ' Published open access with verifiable citations on ResearchWithMe.';
    const combined = clean.endsWith('.') ? `${clean}${suffix}` : `${clean}.${suffix}`;
    return combined.length <= maxLen ? combined : clampSeoDescription(combined, 0, maxLen);
  }
  return clean;
}

export function pageMetadata({
  title,
  description,
  path,
  type = 'website',
  imagePath,
  robots,
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  imagePath?: string;
  robots?: { index: boolean; follow: boolean };
}): PageMetadata {
  const seoTitle = clampSeoTitle(title);
  const seoDescription = clampSeoDescription(description);
  const url = absoluteUrl(path);
  const resolvedImage =
    imagePath && !imagePath.startsWith('data:')
      ? absoluteUrl(imagePath)
      : absoluteUrl('/opengraph-image');
  const fullTitle = `${seoTitle} | ${SITE_NAME}`;
  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description: seoDescription,
      url,
      siteName: SITE_NAME,
      type,
      images: [{ url: resolvedImage, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: seoDescription,
      images: [resolvedImage],
    },
    ...(robots ? { robots } : {}),
  };
}
