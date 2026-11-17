// @vitest-environment jsdom
/**
 * Compatibility shims surface test — the exact contract shared client
 * components rely on while the Pages build aliases next/link, next/image,
 * next/navigation and next/dynamic to cloudflare-pages/src/compat/*.
 */
import { describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ImageShim } from '@/test/stubs/next/image';
import { LinkShim } from '@/test/stubs/next/link';
import { dynamic } from '@/test/stubs/next/dynamic';
import { useParams, usePathname, useRouter } from '@/test/stubs/next/navigation';

describe('next/link shim', () => {
  it('renders existing href-based links using the React Router context', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(LinkShim, { href: '/papers' }, 'Papers')),
    );
    expect(html).toContain('href="/papers"');
    expect(html).toContain('Papers');
  });

  it('maps internal URLs to the router and external URLs to plain anchors', () => {
    const internal = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(LinkShim, { href: '/post/some-article', className: 'nav' }, 'Read'),
      ),
    );
    expect(internal).toContain('href="/post/some-article"');
    expect(internal).toContain('class="nav"');

    for (const external of ['https://example.org/x', 'http://example.org', 'mailto:hi@example.org', 'tel:+15551234']) {
      const html = renderToStaticMarkup(
        createElement(MemoryRouter, null, createElement(LinkShim, { href: external }, 'Go')),
      );
      expect(html).toContain(`href="${external}"`);
    }
  });

  it('passes anchor props through and swallows next-only flags', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(
          LinkShim,
          { href: '/dashboard', 'aria-current': 'page', prefetch: true, replace: true, scroll: false },
          'Dashboard',
        ),
      ),
    );
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('prefetch');
    expect(html).not.toContain('scroll');
  });
});

describe('next/image shim', () => {
  it('renders an implicitly lazy image with alt and sizes', () => {
    const html = renderToStaticMarkup(
      createElement(ImageShim, {
        src: '/images/cover.png',
        alt: 'Cover art',
        sizes: '(max-width: 640px) 100vw, 33vw',
        className: 'cover',
      }),
    );
    expect(html).toContain('src="/images/cover.png"');
    expect(html).toContain('alt="Cover art"');
    expect(html).toContain('sizes="(max-width: 640px) 100vw, 33vw"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it('fills its positioned parent when fill is set', () => {
    const html = renderToStaticMarkup(
      createElement(ImageShim, { src: '/images/hero.jpeg', alt: '', fill: true, className: 'object-cover' }),
    );
    expect(html).toContain('position:absolute');
    expect(html).toContain('inset:0');
    expect(html).not.toContain('width=');
  });

  it('marks priority images eager with high fetch priority', () => {
    const html = renderToStaticMarkup(
      createElement(ImageShim, { src: '/images/hero.jpeg', alt: 'Hero', fill: true, priority: true }),
    );
    expect(html).toContain('loading="eager"');
    // React 19 emits fetchPriority and a preload <link> for it in SSR markup.
    expect(html).toContain('fetchPriority="high"');
  });

  it('keeps explicit dimensions for non-fill images', () => {
    const html = renderToStaticMarkup(
      createElement(ImageShim, { src: '/x.png', alt: 'x', width: 640, height: 360 }),
    );
    expect(html).toContain('width="640"');
    expect(html).toContain('height="360"');
  });
});

describe('next/navigation shim', () => {
  const PathnameProbe = () => {
    const pathname = usePathname();
    return createElement('p', { 'data-testid': 'path' }, pathname);
  };

  it('reports the current location pathname', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, { initialEntries: ['/papers?topic=graphs'] }, createElement(PathnameProbe)),
    );
    expect(html).toContain('/papers');
    expect(html).not.toContain('topic=graphs');
  });

  it('reads matched route params', () => {
    const ParamsProbe = () => {
      const params = useParams<{ id?: string }>();
      return createElement('p', null, `id:${params.id ?? 'none'}`);
    };
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/post/abc-123'] },
        createElement(Routes, null, createElement(Route, { path: '/post/:id', element: createElement(ParamsProbe) })),
      ),
    );
    expect(html).toContain('id:abc-123');
  });

  it('exposes a working router for navigation', async () => {
    const LocationProbe = () => {
      const location = useLocation();
      const router = useRouter();
      return createElement(
        'button',
        { type: 'button', onClick: () => router.push('/assistant') },
        `at:${location.pathname}`,
      );
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(LocationProbe)));
    });
    expect(container.textContent).toBe('at:/');

    const button = container.querySelector('button')!;
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toBe('at:/assistant');

    await act(async () => root.unmount());
    container.remove();
  });
});

describe('next/dynamic shim', () => {
  const importer = () => Promise.resolve({ default: () => createElement('p', null, 'chunk loaded') });

  it('ssr:false renders the placeholder on first pass', () => {
    const Loaded = dynamic(importer, {
      ssr: false,
      loading: () => createElement('p', null, 'loading…'),
    });
    const html = renderToStaticMarkup(createElement(Loaded));
    expect(html).toContain('loading…');
    expect(html).not.toContain('chunk loaded');
  });

  it('ssr:false swaps in the chunk after mount in the browser', async () => {
    const Loaded = dynamic(importer, {
      ssr: false,
      loading: () => createElement('p', null, 'loading…'),
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(Loaded));
    });
    // With the import resolved inside act, the chunk has been swapped in.
    expect(container.textContent).toBe('chunk loaded');

    await act(async () => root.unmount());
    container.remove();
  });

  it('default mode renders its Suspense fallback during the first pass', () => {
    // An importer that never resolves keeps React on the fallback deterministically.
    const Loaded = dynamic(() => new Promise<{ default: React.ComponentType }>(() => {}), {
      loading: () => createElement('p', null, 'suspense fallback'),
    });
    const html = renderToStaticMarkup(createElement(Loaded));
    expect(html).toContain('suspense fallback');
  });
});
