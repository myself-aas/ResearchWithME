import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';
import LocaleProvider from '@/components/i18n/LocaleProvider';

// ResearchWithMe follows the πeme v3.1 design system (docs/pieme-design-system-v3.1.md):
// Newsreader for editorial reading, Inter for interface chrome, JetBrains Mono
// for metadata. Newsreader and Inter are self-hosted OFL faces loaded here via
// next/font/local; JetBrains Mono is requested by name with a system mono
// fallback in globals.css.
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
    default: `${SITE_NAME} — Open-Access Research Reviews`,
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
  openGraph: {
    title: `${SITE_NAME} — Open-Access Research Reviews & Repository Teardowns`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
    images: [{ url: absoluteUrl('/opengraph-image'), width: 1200, height: 630, alt: `${SITE_NAME} — Open-Access Research Reviews` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Open-Access Research Reviews`,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl('/opengraph-image')],
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
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF9F6' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0D10' },
  ],
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('rwm-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',t==='light');}catch(e){}})();`;

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
        <LocaleProvider>
          <div id="main-content" tabIndex={-1} className="min-h-screen outline-none">
            {children}
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
