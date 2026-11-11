/**
 * Archive routes + design-system shell (Task 12A): the HTML surface of
 * /papers, /authors, /editions, /editorial-board, and the locale-aware
 * document shell. The browser-level spec lives in test/e2e/archive-routes.spec.ts;
 * these contract tests run without a browser.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import { paperFixture } from '@/test/fixtures/paper';
import type { ProfileRow } from '@/lib/author-directory-core';

const MAYA_PROFILE: ProfileRow & { published: boolean } = {
  slug: 'maya-lin',
  published: true,
  display_name: 'Maya Lin',
  bio: 'Maya Lin reviews reproducible systems research.',
  role: 'Reviewing editor',
  domain: 'Scholarly Tech',
  institution: 'ResearchWithMe',
  avatar_url: '',
  orcid: '0000-0002-1825-0097',
  github: '',
  website: '',
  scholar: '',
  created_at: '2026-01-01T00:00:00.000Z',
};

const repoRoot = process.cwd();

describe('the design-system shell (Task 12A)', () => {
  it('self-hosts both OFL faces with their license texts', () => {
    for (const file of [
      'public/fonts/inter-latin-variable.woff2',
      'public/fonts/newsreader-latin-variable.woff2',
    ]) {
      expect(existsSync(path.join(repoRoot, file)), `${file} must exist`).toBe(true);
    }
    const interLicense = readFileSync(path.join(repoRoot, 'public/fonts/INTER-LICENSE.txt'), 'utf8');
    expect(interLicense).toContain('SIL OPEN FONT LICENSE');
    const newsreaderLicense = readFileSync(path.join(repoRoot, 'public/fonts/NEWSREADER-LICENSE.txt'), 'utf8');
    expect(newsreaderLicense).toContain('SIL OPEN FONT LICENSE');
  });

  it('links the compiled stylesheet and preloads both variable faces', async () => {
    const app = createTestApp();
    const res = await app.request('/papers');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('rel="preload" as="font" type="font/woff2" href="/fonts/newsreader-latin-variable.woff2"');
    expect(html).toContain('rel="preload" as="font" type="font/woff2" href="/fonts/inter-latin-variable.woff2"');
  });

  it('resolves the interface locale from the pieme-locale cookie', async () => {
    const app = createTestApp();
    const res = await app.request('/papers', { headers: { cookie: 'pieme-locale=bn' } });
    const html = await res.text();
    expect(html).toContain('<html lang="bn" dir="ltr">');
    expect(html).toContain('window.__RWM_LOCALE__="bn"');
  });

  it('falls back to en for a missing or unsupported cookie value', async () => {
    const app = createTestApp();
    for (const cookie of ['pieme-locale=xx-evil"><script>alert(1)</script>', 'pieme-locale=', 'other=bn']) {
      const res = await app.request('/papers', { headers: { cookie } });
      const html = await res.text();
      expect(html).toContain('<html lang="en" dir="ltr">');
      expect(html).not.toContain('xx-evil');
    }
  });

  it('keeps the skip link target inside every archive surface', async () => {
    const app = createTestApp();
    const html = await (await app.request('/papers')).text();
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
  });
});

describe('GET /papers', () => {
  it('renders the archive with loader-provided records and canonical metadata', async () => {
    const app = createTestApp();
    app.seedPaper(paperFixture({ slug: 'archive-probe', title: 'Archive probe paper' }));

    const res = await app.request('/papers');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Papers, methods, and reproducible artifacts');
    expect(html).toContain('Archive probe paper');
    expect(html).toContain('<title>Papers — ResearchWithMe</title>');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/papers"');
  });

  it('renders an empty-but-valid archive when the corpus is unconfigured', async () => {
    const app = createTestApp({ configured: false });
    const res = await app.request('/papers');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Papers, methods, and reproducible artifacts');
  });

  it('serves loader data through the /__data transport', async () => {
    const app = createTestApp();
    app.seedPaper(paperFixture({ slug: 'data-probe', title: 'Data transport probe paper' }));

    const res = await app.request('/__data?routeId=papers&url=%2Fpapers');
    expect(res.status).toBe(200);
    const envelope = await res.json();
    expect(envelope.kind).toBe('data');
    expect(JSON.stringify(envelope.data)).toContain('data-probe');
  });
});

describe('GET /authors', () => {
  it('renders the contributors directory with the seeded published profile', async () => {
    const app = createTestApp({ profileRows: [MAYA_PROFILE] });
    const res = await app.request('/authors');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('The reviewers behind the archive');
    expect(html).toContain('Maya Lin');
    expect(html).toContain('<title>Contributors — ResearchWithMe</title>');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/authors"');
  });

  it('renders an empty directory rather than failing when the directory is unpublished', async () => {
    const app = createTestApp();
    const res = await app.request('/authors');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('The reviewers behind the archive');
  });
});

describe('GET /editions and /editorial-board', () => {
  it('renders the editions archive', async () => {
    const app = createTestApp();
    const res = await app.request('/editions');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Quarterly editions for offline reading');
    expect(html).toContain('<title>Quarterly editions — ResearchWithMe</title>');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/editions"');
  });

  it('renders the editorial board with the standards and the apply link', async () => {
    const app = createTestApp();
    const res = await app.request('/editorial-board');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Editorial standards and the people who keep them');
    expect(html).toContain('What the editorial gate checks');
    expect(html).toContain('rel="canonical" href="https://researchwith.me/editorial-board"');
  });
});
