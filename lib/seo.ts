import type { Metadata } from 'next';
import { AUTHOR, SITE } from './site';

export const SITE_NAME = SITE.name;
export const SITE_URL = SITE.url;
export const SITE_DESCRIPTION = SITE.description;

export function absoluteUrl(path = '/'): string {
  return new URL(path.startsWith('/') ? path : `/${path}`, SITE_URL).toString();
}

export function pageMetadata({
  title,
  description,
  path,
  type = 'website',
  imagePath,
  publishedTime,
  modifiedTime,
  tags,
  noIndex = false,
  markdownPath,
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  imagePath?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  noIndex?: boolean;
  /** Same content, machine-readable representation. Emits `<link rel="alternate">`. */
  markdownPath?: string;
}): Metadata {
  const url = absoluteUrl(path);
  // Every page ships a 1200×630 share card. Posts override with their own
  // generated card; everything else falls back to the site card.
  const images = [
    {
      url: imagePath
        ? imagePath.startsWith('http')
          ? imagePath
          : absoluteUrl(imagePath)
        : absoluteUrl('/opengraph-image'),
      width: 1200,
      height: 630,
      alt: title,
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: path,
      types: {
        'application/rss+xml': SITE.feedPath,
        'application/feed+json': '/feed.json',
        ...(markdownPath ? { 'text/markdown': markdownPath } : {}),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type,
      locale: SITE.locale,
      images,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(tags ? { tags } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((image) => image.url),
    },
    authors: [{ name: AUTHOR.name, url: absoluteUrl('/about') }],
    ...(noIndex
      ? { robots: { index: false, follow: true, 'max-image-preview': 'large' as const } }
      : {}),
  };
}
