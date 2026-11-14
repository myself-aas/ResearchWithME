import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AboutPage from '@/components/AboutPage';
import ApiDocsReference from '@/components/ApiDocsReference';
import PrivacyPage from '@/components/PrivacyPage';
import { API_GROUPS } from '@/lib/api-catalog';

const referencePages = [
  ['about', AboutPage],
  ['privacy', PrivacyPage],
  ['api reference', ApiDocsReference],
] as const;

function render(Component: ComponentType) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Component)));
}

function ids(html: string) {
  return [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
}

function linksForNavigation(html: string, ariaLabel: string) {
  const nav = html.match(new RegExp(`<nav aria-label="${ariaLabel}"[\\s\\S]*?<\\/nav>`))?.[0] ?? '';
  return [...nav.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
}

describe('reference-page layouts', () => {
  it('about_toc_links_resolve_to_existing_sections', () => {
    const html = render(AboutPage);
    const links = linksForNavigation(html, 'About page sections');
    const expected = ['mission-heading', 'verification-heading', 'reuse-heading', 'funding-heading', 'governance-heading'];
    expect(links).toEqual(expected);
    for (const id of expected) expect(ids(html).filter((candidate) => candidate === id)).toHaveLength(1);
  });

  it('privacy_toc_links_resolve_to_existing_sections', () => {
    const html = render(PrivacyPage);
    const links = linksForNavigation(html, 'Privacy policy sections');
    const expected = ['principles-heading', 'local-storage-heading', 'accounts-heading', 'rights-heading'];
    expect(links).toEqual(expected);
    for (const id of expected) expect(ids(html).filter((candidate) => candidate === id)).toHaveLength(1);
  });

  it('api_reference_toc_uses_api_group_ids', () => {
    const html = render(ApiDocsReference);
    const links = linksForNavigation(html, 'API groups');
    expect(links).toEqual(API_GROUPS.map((group) => group.id));
    for (const group of API_GROUPS) expect(ids(html).filter((candidate) => candidate === group.id)).toHaveLength(1);
  });

  it('reference_pages_keep_a_single_main_landmark', () => {
    for (const [name, Component] of referencePages) {
      const html = render(Component);
      expect([...html.matchAll(/<main\b/g)], name).toHaveLength(1);
      expect([...html.matchAll(/<h1\b/g)], name).toHaveLength(1);
    }
  });
});
