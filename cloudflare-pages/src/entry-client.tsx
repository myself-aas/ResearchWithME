import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createBrowserRoutes, HYDRATION_DATA_KEY } from './routes';
import LocaleProvider from '@/components/i18n/LocaleProvider';
import { DEFAULT_LOCALE, resolveLocale, type Locale } from '@/lib/i18n/locales';
import './globals.css';

declare global {
  interface Window {
    __RWM_HYDRATION__?: unknown;
  }
}

// The SSR pass embeds the loader state it resolved; resume it instead of
// re-fetching every loader on first paint. The value is plain JSON produced
// by the server (see document.tsx), never user input evaluated as code.
const hydrationData = window[HYDRATION_DATA_KEY];
const options = hydrationData
  ? ({ hydrationData } as Parameters<typeof createBrowserRouter>[1])
  : undefined;

const router = createBrowserRouter(createBrowserRoutes(), options);
const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from the SSR document');

// The SSR document resolves the locale from the pieme-locale cookie and
// embeds it as window.__RWM_LOCALE__; the provider starts from the same
// value so server and browser render the same first paint.
const rawLocale = (window as unknown as { __RWM_LOCALE__?: unknown }).__RWM_LOCALE__;
const initialLocale: Locale = typeof rawLocale === 'string' ? resolveLocale(rawLocale) : DEFAULT_LOCALE;

hydrateRoot(
  root,
  <StrictMode>
    <LocaleProvider initialLocale={initialLocale}>
      <RouterProvider router={router} />
    </LocaleProvider>
  </StrictMode>,
);
