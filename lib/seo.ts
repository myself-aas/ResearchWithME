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
}): Metadata {
  const url = absoluteUrl(path);
  const images = imagePath
    ? [{ url: imagePath.startsWith('http') ? imagePath : absoluteUrl(imagePath), width: 1200, height: 630, alt: title }]
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      types: { 'application/rss+xml': SITE.feedPath },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type,
      locale: SITE.locale,
      ...(images ? { images } : {}),
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(tags ? { tags } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
    authors: [{ name: AUTHOR.name, url: absoluteUrl('/about') }],
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}
