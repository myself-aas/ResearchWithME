import { describe, expect, it } from 'vitest';
import {
  estimateTokens,
  extractJsonLd,
  extractPageMetadata,
  htmlToAgentMarkdown,
  renderFrontmatter,
  stripNonContent,
} from '@/lib/agents/markdown';
import { wantsMarkdown } from '@/middleware';

describe('wantsMarkdown (Accept negotiation)', () => {
  it('accepts a bare text/markdown preference', () => {
    expect(wantsMarkdown('text/markdown')).toBe(true);
  });
  it('accepts text/markdown among other options, with parameters', () => {
    expect(wantsMarkdown('text/html, text/markdown;q=0.9')).toBe(true);
    expect(wantsMarkdown('text/markdown, application/json')).toBe(true);
  });
  it('is case-insensitive on the media type', () => {
    expect(wantsMarkdown('TEXT/MARKDOWN')).toBe(true);
  });
  it('rejects browser-style and unrelated accept headers', () => {
    expect(wantsMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')).toBe(false);
    expect(wantsMarkdown('application/json')).toBe(false);
    expect(wantsMarkdown('text/plain')).toBe(false);
  });
  it('rejects missing headers', () => {
    expect(wantsMarkdown(null)).toBe(false);
    expect(wantsMarkdown(undefined)).toBe(false);
  });
});

describe('estimateTokens', () => {
  it('uses the site-wide four-characters-per-token estimate', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });
});

describe('extractPageMetadata', () => {
  it('prefers standard meta forms over Open Graph fallbacks', () => {
    const html = `
      <meta name="title" content="Standard title">
      <meta property="og:title" content="OG title">
      <meta name="description" content="Standard description">
      <meta property="og:description" content="OG description">
      <meta property="og:image" content="https://example.com/og.png">
    `;
    expect(extractPageMetadata(html)).toEqual({
      title: 'Standard title',
      description: 'Standard description',
      image: 'https://example.com/og.png',
    });
  });
  it('falls back to Open Graph when the standard form is missing', () => {
    const html = `
      <meta property="og:title" content="OG title">
      <meta property="og:description" content="OG description">
    `;
    expect(extractPageMetadata(html)).toEqual({
      title: 'OG title',
      description: 'OG description',
    });
  });
  it('emits only fields that are present and tolerates attribute order and single quotes', () => {
    expect(extractPageMetadata('<p>no meta here</p>')).toEqual({});
    expect(extractPageMetadata('<meta content="T" name="title">')).toEqual({ title: 'T' });
    expect(extractPageMetadata("<meta name='title' content='S'>")).toEqual({ title: 'S' });
  });
});

describe('extractJsonLd', () => {
  it('collects every ld+json block in document order', () => {
    const html = `
      <script type="application/ld+json">{"@type":"Article"}</script>
      <script>var x = 1;</script>
      <script type="application/ld+json">{"@type":"Person"}</script>
    `;
    expect(extractJsonLd(html)).toEqual(['{"@type":"Article"}', '{"@type":"Person"}']);
  });
  it('ignores scripts of other types and empty blocks', () => {
    expect(extractJsonLd('<script type="text/javascript">nope()</script>')).toEqual([]);
    expect(extractJsonLd('<script type="application/ld+json">   </script>')).toEqual([]);
  });
});

describe('stripNonContent', () => {
  it('removes script, style, head, header, footer and comments', () => {
    const html = `
      <!doctype html><html><head><style>.x{}</style></head>
      <body>
        <header>site nav</header>
        <article><h1>Real content</h1><p>Body text.</p></article>
        <footer>site footer</footer>
        <script>evil()</script>
        <!-- a comment -->
      </body></html>
    `;
    const stripped = stripNonContent(html);
    expect(stripped).not.toContain('site nav');
    expect(stripped).not.toContain('site footer');
    expect(stripped).not.toContain('.x{}');
    expect(stripped).not.toContain('evil()');
    expect(stripped).not.toContain('a comment');
    expect(stripped).toContain('<h1>Real content</h1>');
    expect(stripped).toContain('<p>Body text.</p>');
  });
});

describe('renderFrontmatter', () => {
  it('renders only present fields, quoted and escaped', () => {
    expect(renderFrontmatter({ title: 'T', description: 'D', image: 'https://x/y.png' })).toBe(
      '---\ntitle: "T"\ndescription: "D"\nimage: "https://x/y.png"\n---\n\n',
    );
    expect(renderFrontmatter({})).toBe('');
    expect(renderFrontmatter({ title: 'He said "hi"' })).toContain('title: "He said \\"hi\\""');
  });
});

describe('htmlToAgentMarkdown', () => {
  const page = `
    <!doctype html>
    <html>
      <head>
        <meta name="title" content="Travel notes">
        <meta name="description" content="A short summary">
        <meta property="og:image" content="https://example.com/cover.png">
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"}</script>
        <script>tracker()</script>
      </head>
      <body>
        <header>Site navigation</header>
        <main>
          <h1>Travel notes</h1>
          <p>The first paragraph of the <a href="https://example.com/x">story</a>.</p>
          <ul><li>One</li><li>Two</li></ul>
        </main>
        <footer>Site footer</footer>
      </body>
    </html>
  `;

  it('produces frontmatter, stripped body markdown and a trailing json block', () => {
    const { markdown, tokens } = htmlToAgentMarkdown(page);
    expect(markdown.startsWith('---\ntitle: "Travel notes"\ndescription: "A short summary"\nimage: "https://example.com/cover.png"\n---\n\n')).toBe(true);
    expect(markdown).toContain('# Travel notes');
    expect(markdown).toContain('[story](https://example.com/x)');
    expect(markdown).toContain('-   One');
    expect(markdown).toContain('-   Two');
    expect(markdown).not.toContain('Site navigation');
    expect(markdown).not.toContain('Site footer');
    expect(markdown).not.toContain('tracker()');
    expect(markdown.trimEnd().endsWith('```json\n{"@context":"https://schema.org","@type":"Article"}\n```')).toBe(true);
    expect(tokens).toBe(estimateTokens(markdown));
  });

  it('omits frontmatter when the page carries no supported meta', () => {
    const { markdown } = htmlToAgentMarkdown('<html><body><h1>Bare</h1></body></html>');
    expect(markdown.startsWith('---')).toBe(false);
    expect(markdown).toContain('# Bare');
  });
});
