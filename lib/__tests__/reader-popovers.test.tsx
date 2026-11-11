// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import axe from 'axe-core';
import InlineCitationPopover from '@/components/reader/InlineCitationPopover';
import SpecialistBadgePopover from '@/components/reader/SpecialistBadgePopover';
import MarkdownBody from '@/components/MarkdownBody';
import { renderWithInlineCitations } from '@/lib/citations-inline';

const sampleSource = {
  title: 'Inside vLLM & PagedAttention',
  author: 'Maya Lin',
  year: '2026',
  journal: 'ResearchWithMe',
  doi: '10.5555/rwm.post-1',
};

describe('InlineCitationPopover, SpecialistBadgePopover & safe prose citation tokenizer', () => {
  it('renders accessible citation trigger and specialist badge with zero axe violations', async () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(
          'main',
          null,
          createElement('p', null, 'Claim ', createElement(InlineCitationPopover, { label: '[1]', source: sampleSource })),
          createElement(SpecialistBadgePopover, {
            author: {
              id: 'marcus-vance',
              name: 'Prof. Marcus Vance',
              role: 'Fellow',
              institution: 'Cambridge',
              orcid: '0000-0001-9234-8812',
              verifiedVia: 'orcid',
              verifiedIdentifier: '0000-0001-9234-8812',
            },
          }),
        ),
      ),
    );
    document.body.innerHTML = html;
    const results = await axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    expect(results.violations).toEqual([]);
  });

  it('Review Focus #3: converts matched [1] and DOI references while ignoring code spans, links, unmatched [99], and escaping raw HTML', () => {
    const map = { '1': sampleSource, '10.5555/rwm.post-1': sampleSource };
    const plain = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement('div', null, renderWithInlineCitations('See [1], [99], and </script><script>alert(1)</script>', map)),
      ),
    );
    expect(plain).toContain('aria-haspopup="dialog"');
    expect(plain).toContain('[99]');
    expect(plain).not.toContain('<script>');

    const md = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(MarkdownBody, {
          markdown: 'Inline `10.5555/rwm.post-1` and [link](https://doi.org/10.5555/rwm.post-1) vs cited 10.5555/rwm.post-1.',
          citations: map,
        }),
      ),
    );
    // Only the standalone prose DOI becomes a popover button; code and <a> stay intact
    expect((md.match(/aria-haspopup="dialog"/g) ?? []).length).toBe(1);
  });
});
