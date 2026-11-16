// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import AuthorProfileCard from '@/components/AuthorProfileCard';
import { makeTestArticle } from '../../test/fixtures/articles';

it('keeps profile actions consistent and reports share failure without losing links', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const author = { ...makeTestArticle().author, orcid: '0000-0002-1825-0097', github: 'https://github.com/fixture' };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><AuthorProfileCard author={author} /></MemoryRouter>));
    const share = [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Share profile'))!;
    const studio = [...element.querySelectorAll('a')].find((link) => link.textContent?.includes('Writer studio'))!;
    expect(studio.getAttribute('href')).toBe('/write');
    for (const action of [share, studio]) {
      for (const cls of ['min-h-11', 'rounded-full', 'px-6', 'py-2', 'font-sans', 'text-sm', 'font-semibold']) expect(action.classList.contains(cls), `${action.textContent}: ${cls}`).toBe(true);
    }
    expect(element.querySelector('a[href="https://orcid.org/0000-0002-1825-0097"]')).not.toBeNull();
    expect(element.querySelector('a[href="https://github.com/fixture"]')).not.toBeNull();
    await act(async () => { share.click(); await Promise.resolve(); });
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Sharing is unavailable');
  } finally { act(() => root.unmount()); element.remove(); }
});
