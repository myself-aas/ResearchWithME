// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import AuthorDirectory from '@/components/AuthorDirectory';
import { makeTestArticle } from '../../test/fixtures/articles';

it('filters contributors with consistent pill controls', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  const base = makeTestArticle().author;
  const authors = [{ ...base, id: 'orcid-author', name: 'Fixture ORCID', orcid: '0000-0002-1825-0097' }, { ...base, id: 'github-author', name: 'Fixture GitHub', github: 'https://github.com/fixture' }];
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><AuthorDirectory authors={authors} /></MemoryRouter>));
    const group = element.querySelector('[role="group"]')!;
    const filters = [...group.querySelectorAll('button')];
    expect(filters).toHaveLength(3);
    for (const filter of filters) { expect(filter.classList.contains('rounded-full')).toBe(true); expect(filter.classList.contains('min-h-11')).toBe(true); }
    act(() => filters[1].click());
    expect(filters[1].getAttribute('aria-pressed')).toBe('true');
    expect(element.textContent).toContain('Fixture ORCID');
    expect(element.textContent).not.toContain('Fixture GitHub');
    act(() => filters[2].click());
    expect(element.textContent).toContain('Fixture GitHub');
    expect(element.textContent).not.toContain('Fixture ORCID');
  } finally { act(() => root.unmount()); element.remove(); vi.unstubAllGlobals(); }
});
