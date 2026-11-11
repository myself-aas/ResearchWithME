// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ReadingProgressDock from '@/components/reader/ReadingProgressDock';
import { focusHashTarget, shouldEnableSmoothScroll } from '@/components/reader/ArticleSmoothScroll';

describe('ArticleSmoothScroll & ReadingProgressDock', () => {
  it('Review Focus #5: disables Lenis on prefers-reduced-motion and moves keyboard focus to #hash targets', () => {
    expect(shouldEnableSmoothScroll({ matches: true })).toBe(false);
    expect(shouldEnableSmoothScroll({ matches: false })).toBe(true);

    document.body.innerHTML = '<section id="discussion"><h2>Discussion</h2></section>';
    const target = focusHashTarget(document, '#discussion');
    expect(target?.id).toBe('discussion');
    expect(document.activeElement).toBe(target);
  });

  it('renders print-hidden floating progress dock with tabular mono progress, cite popover trigger, and bookmark toggle', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ReadingProgressDock, {
          itemId: 'post-1',
          itemKind: 'post',
          readTime: '9 min read',
          citationSource: {
            title: 'Inside vLLM & PagedAttention',
            author: 'Maya Lin',
            year: '2026',
            journal: 'ResearchWithMe',
            doi: '10.5555/rwm.post-1',
          },
          citeHref: '/cite?article=inside-vllm-and-paged-attention',
          discussionAnchor: '#discussion',
        }),
      ),
    );
    expect(html).toContain('print:hidden');
    expect(html).toContain('font-mono');
    expect(html).toContain('0%');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('#discussion');
  });
});
