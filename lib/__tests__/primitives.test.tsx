import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PenSquare } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { Card, Icon, Link, Stack, Text, VisuallyHidden } from '@/components/primitives';

// next/link resolves to the Pages router shim under Vitest, which needs a router.
const html = (node: React.ReactElement) => renderToStaticMarkup(h(MemoryRouter, null, node));
const classesOf = (markup: string) => new Set((markup.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean));
const sameClasses = (markup: string, expected: string) => expect(classesOf(markup)).toEqual(new Set(expected.split(' ')));

describe('primitives reproduce the house class strings (migration is pixel-identical)', () => {
  it('Text eyebrow / titles', () => {
    sameClasses(
      html(h(Text, { as: 'p', variant: 'eyebrow', color: 'secondary' }, 'x')),
      'font-mono text-xs uppercase tracking-wider text-ink-secondary',
    );
    sameClasses(
      html(h(Text, { as: 'h2', variant: 'eyebrow', weight: 'semibold' }, 'x')),
      'font-mono text-xs font-semibold uppercase tracking-wider text-ink',
    );
    sameClasses(html(h(Text, { as: 'h2', variant: 'card-title' }, 'x')), 'font-serif text-xl font-semibold text-ink');
    sameClasses(html(h(Text, { as: 'h2', variant: 'section-title' }, 'x')), 'font-serif text-2xl font-semibold text-ink');
    sameClasses(html(h(Text, { as: 'h1', variant: 'page-title' }, 'x')), 'font-serif text-2xl font-bold text-ink sm:text-3xl');
    expect(html(h(Text, { as: 'h3', variant: 'card-title' }, 'x'))).toMatch(/^<h3 /);
  });

  it('Link variants, internal vs external', () => {
    const inline = html(h(Link, { href: '/papers' }, 'Papers'));
    sameClasses(inline, 'font-medium text-brand underline underline-offset-4 hover:text-brand-pressed');
    expect(inline).toContain('href="/papers"');
    const external = html(h(Link, { href: 'https://doi.org/10.1/x', variant: 'quiet', target: '_blank', rel: 'noreferrer' }, 'DOI'));
    expect(external).toContain('target="_blank"');
    sameClasses(external, 'underline-offset-4 hover:text-ink hover:underline');
    // `plain` emits no class attribute at all.
    expect(html(h(Link, { href: '/x', variant: 'plain' }, 'x'))).not.toContain('class=');
  });

  it('Card default is the product panel', () => {
    sameClasses(html(h(Card, null, 'x')), 'rounded-sm border border-line bg-surface p-4');
    sameClasses(html(h(Card, { padding: 'lg', radius: 'md' }, 'x')), 'rounded-md border border-line bg-surface p-5');
    expect(html(h(Card, { as: 'article' }, 'x'))).toMatch(/^<article /);
  });

  it('Stack uses statically generated classes only', () => {
    sameClasses(
      html(h(Stack, { direction: 'horizontal', gap: 'sm', align: 'center', justify: 'between', wrap: true }, 'x')),
      'flex gap-2 items-center justify-between flex-wrap',
    );
  });

  it('Icon is decorative unless labelled', () => {
    const decorative = html(h(Icon, { icon: PenSquare }));
    expect(decorative).toContain('aria-hidden="true"');
    expect(decorative).toContain('h-4 w-4');
    const labelled = html(h(Icon, { icon: PenSquare, size: 'lg', label: 'Write' }));
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="Write"');
    expect(labelled).not.toContain('aria-hidden');
  });

  it('VisuallyHidden is sr-only and keeps className', () => {
    sameClasses(html(h(VisuallyHidden, { className: 'x', children: 'hidden' })), 'sr-only x');
  });
});
