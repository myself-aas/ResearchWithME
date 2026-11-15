// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import BlogHero from '@/components/BlogHero';

it('offers an accessible 44px clear-search action that clears the query', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const onSearch = vi.fn();
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    act(() => root.render(<MemoryRouter><BlogHero searchQuery="evidence" setSearchQuery={onSearch} selectedFormat="All" setSelectedFormat={() => {}} totalArticles={1} totalWriters={1} /></MemoryRouter>));
    const button = [...element.querySelectorAll('button')].find((item) => item.textContent?.includes('Clear search'))!;
    expect(button).toBeDefined();
    expect(button.classList.contains('h-11')).toBe(true);
    expect(button.classList.contains('w-11')).toBe(true);
    act(() => button.click());
    expect(onSearch).toHaveBeenCalledWith('');
  } finally { act(() => root.unmount()); element.remove(); }
});
