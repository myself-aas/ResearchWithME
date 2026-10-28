import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Providers from '@/components/Providers';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';

// The journal is set in the Aptos family (Aptos Serif for reading, Aptos for
// interface chrome, Aptos Mono for data). Aptos is a Microsoft-licensed face
// and is not redistributed here: the stacks in globals.css request the
// installed copy by name. These self-hosted OFL faces are the metric-adjusted
// fallbacks for readers who do not have Aptos installed.
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
    default: `${SITE_NAME} — Open-Access Research Reviews & Repository Teardowns`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'open access research',
    'scholarly publishing',
    'paper reviews',
    'reproducible research',
    'repository teardowns',
    'open science',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${SITE_NAME} — Open-Access Research Reviews & Repository Teardowns`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Open-Access Research Reviews`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  category: 'education',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: '#fafaf9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="bg-stone-50 font-serif text-stone-900 antialiased selection:bg-amber-900 selection:text-white" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only left-4 top-4 z-[100] rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white shadow-sm focus:not-sr-only focus:fixed"
        >
          Skip to main content
        </a>
        <Providers>
          <div id="main-content" tabIndex={-1} className="min-h-screen outline-none">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
