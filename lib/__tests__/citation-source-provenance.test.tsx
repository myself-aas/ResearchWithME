// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import CitationTool from '@/components/CitationTool';
import { makeTestArticle } from '@/test/fixtures/articles';

vi.mock('@/components/BlogHeader', () => ({ default: () => null }));
vi.mock('@/components/BlogFooter', () => ({ default: () => null }));
vi.mock('@/components/lottie', () => ({ VerifyMark: () => null }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('cites the selected review using its publication year, not its reviewed artifact DOI', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const article = makeTestArticle({ title: 'Review of evidence', publishedAt: '1 February 2024', dateISO: '2024-02-01', reviewedArtifact: { type: 'paper', title: 'Another paper', url: 'https://example.org/source', identifier: '10.5555/artifact', meta: 'Journal of Evidence' } });
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><CitationTool initialArticles={[article]} /></MemoryRouter>));
    const output = element.querySelector<HTMLTextAreaElement>('#citation-output')!.value;
    expect(output).toContain('(2024)');
    expect(output).toContain('Review of evidence');
    expect(output).not.toContain('10.5555/artifact');
    expect(output).not.toContain('ResearchWithMe Technical Reviews');
    expect(output).toContain('https://researchwith.me/post/test-article-1');
    expect(element.querySelector('a[href*="doi.org"]')).toBeNull();
  } finally { await act(async () => root.unmount()); element.remove(); }
});

it('does not invent a year when publication date is absent', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><CitationTool initialArticles={[makeTestArticle({ dateISO: undefined, publishedAt: '' })]} /></MemoryRouter>));
    expect(element.querySelector<HTMLTextAreaElement>('#citation-output')!.value).toContain('(n.d.)');
    expect(element.querySelector<HTMLTextAreaElement>('#citation-output')!.value).not.toContain('2026');
  } finally { await act(async () => root.unmount()); element.remove(); }
});

it('disables output and copy when no published article is available', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><CitationTool initialArticles={[]} /></MemoryRouter>));
    expect(element.querySelector<HTMLTextAreaElement>('#citation-output')!.value).toBe('');
    expect([...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Copy citation'))?.disabled).toBe(true);
    expect(element.textContent).toContain('No published articles are available.');
  } finally { await act(async () => root.unmount()); element.remove(); }
});
