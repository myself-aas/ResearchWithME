// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AssistantPanel from '@/components/AssistantPanel';

vi.mock('@/components/BlogHeader', () => ({ default: () => null }));
vi.mock('@/components/BlogFooter', () => ({ default: () => null }));
vi.mock('@/components/lottie', () => ({ SynthesizeMark: () => null }));

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('reports clipboard failure without presenting the successful answer as a failed request', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    return url === '/api/articles'
      ? new Response(JSON.stringify({ articles: [] }), { status: 200 })
      : new Response(JSON.stringify({ answer: 'An evidence-based answer.', citations: [] }), { status: 200 });
  }));
  const writeText = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<MemoryRouter><AssistantPanel initialArticles={[]} /></MemoryRouter>));
    const example = [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('PagedAttention'))!;
    await act(async () => { example.click(); await Promise.resolve(); });
    expect(element.textContent).toContain('An evidence-based answer.');
    const copy = [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Copy answer'))!;
    await act(async () => { copy.click(); await Promise.resolve(); });
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Clipboard access was blocked');
    expect(element.textContent).not.toContain('The request did not complete.');
    expect([...element.querySelectorAll('button')].some((button) => button.textContent?.includes('Try again'))).toBe(false);
    expect(element.textContent).toContain('An evidence-based answer.');
    await act(async () => { copy.click(); await Promise.resolve(); });
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.textContent).toContain('Copied');
    expect(requests.filter((url) => url === '/api/research-assistant')).toHaveLength(1);
  } finally { await act(async () => root.unmount()); element.remove(); delete (navigator as { clipboard?: Clipboard }).clipboard; }
});
