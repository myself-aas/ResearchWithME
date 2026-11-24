import type { Metadata, Viewport } from 'next';
import './globals.css';
import { semanticDark, semanticLight } from '@/tokens/generated/tokens';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { absoluteUrl, SITE_DESCRIPTION, SITE_URL } from '@/lib/seo';
import { AUTHOR, SITE } from '@/lib/site';

// One downloaded typeface (Plus Jakarta Sans, declared in globals.css). Mono
// text uses the system stack, so there is no third font request on any page.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — essays on research and open code`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE.name,
  authors: [{ name: AUTHOR.name, url: absoluteUrl('/about') }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  // No `keywords` meta tag: it is ignored by search engines and every real
  // signal already comes from the visible text and structured data.
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': SITE.feedPath },
  },
  openGraph: {
    title: `${SITE.name} — essays on research and open code`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
    siteName: SITE.name,
    type: 'website',
    locale: SITE.locale,
    images: [{ url: absoluteUrl('/opengraph-image'), width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — essays on research and open code`,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl('/opengraph-image')],
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  category: 'education',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: semanticLight.canvas },
    { media: '(prefers-color-scheme: dark)', color: semanticDark.canvas },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <link rel="describedby" type="text/plain" title="llms.txt" href="/llms.txt" />
      </head>
      <body className="bg-canvas font-sans text-ink antialiased selection:bg-selection selection:text-ink" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only left-4 top-4 z-[100] rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed"
        >
          Skip to main content
        </a>
        <div className="flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
