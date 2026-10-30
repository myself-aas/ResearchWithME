import type { Metadata } from 'next';

export const SITE_NAME = 'πeme';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me').replace(/\/$/, '');
export const SITE_DESCRIPTION =
  'Open-access reviews of published papers and open repositories, written by specialists whose credentials you can check.';

export function absoluteUrl(path = '/') {
  return new URL(path.startsWith('/') ? path : `/${path}`, SITE_URL).toString();
}

export function toDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function pageMetadata({
  title,
  description,
  path,
  type = 'website',
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}
