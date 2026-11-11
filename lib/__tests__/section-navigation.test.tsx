import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SectionNavigation from '@/components/layout/SectionNavigation';

function render(items: Array<{ id: string; label: string }>, props: Partial<Parameters<typeof SectionNavigation>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(SectionNavigation, {
      items,
      ariaLabel: 'Document sections',
      ...props,
    }),
  );
}

describe('SectionNavigation', () => {
  it('renders_labelled_ordered_anchor_links', () => {
    const html = render([
      { id: 'mission', label: 'Mission' },
      { id: 'governance', label: 'Governance' },
    ]);

    expect(html).toContain('<nav aria-label="Document sections"');
    expect(html).toMatch(/<h2[^>]*>On this page<\/h2>/);
    expect(html).toContain('data-layout-rail="section-navigation"');
    expect(html.indexOf('href="#mission"')).toBeLessThan(html.indexOf('href="#governance"'));
    expect(html).toContain('>Mission</a>');
    expect(html).toContain('>Governance</a>');
  });

  it('uses_custom_heading_without_changing_accessible_name', () => {
    const html = render([{ id: 'intro', label: 'Introduction' }], {
      ariaLabel: 'API group navigation',
      heading: 'API sections',
    });

    expect(html).toContain('<nav aria-label="API group navigation"');
    expect(html).toMatch(/<h2[^>]*>API sections<\/h2>/);
  });

  it('renders_nothing_when_items_are_empty', () => {
    expect(render([])).toBe('');
  });
});
