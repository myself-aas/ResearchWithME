import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { semanticDark, semanticLight } from '@/tokens/generated/tokens';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { absoluteUrl, SITE_DESCRIPTION, SITE_URL } from '@/lib/seo';
import { AUTHOR, SITE } from '@/lib/site';
import PremiumMotionProvider from '@/components/motion/PremiumMotionProvider';
import { Preloader } from '@/components/preloader';
import RouteTransition from '@/components/motion/RouteTransition';

// Self-hosted OFL faces: Inter and Newsreader back the Plus Jakarta Sans
// editorial stacks declared in globals.css.
const inter = localFont({
  src: [{ path: './fonts/inter-latin-variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
  preload: true,
});

const newsreader = localFont({
  src: [{ path: './fonts/newsreader-latin-variable.woff2', weight: '200 800', style: 'normal' }],
  variable: '--font-newsreader',
  display: 'swap',
  fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — essays on research and open code`,
    template: `%s | ${SITE.shortName}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE.name,
  authors: [{ name: AUTHOR.name, url: absoluteUrl('/about') }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  keywords: [
    'research essays',
    'paper reviews',
    'reproducible research',
    'open source teardowns',
    'open science',
    'MDX blog',
  ],
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
  robots: { index: true, follow: true },
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
    <html lang="en" dir="ltr" className={`${inter.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-canvas font-sans text-ink antialiased selection:bg-selection selection:text-ink" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only left-4 top-4 z-[100] rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed"
        >
          Skip to main content
        </a>
        <Preloader minDisplayTime={700} />
        <PremiumMotionProvider>
          <div className="flex min-h-screen flex-col">
            <RouteTransition>{children}</RouteTransition>
          </div>
        </PremiumMotionProvider>
      </body>
    </html>
  );
}
