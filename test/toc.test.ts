import { describe, expect, it } from 'vitest';
import { extractToc } from '@/lib/content/toc';
import { slugify } from '@/lib/content/slug';

describe('extractToc', () => {
  it('collects h2 and h3 headings in order', () => {
    const toc = extractToc('Intro\n\n## First section\n\nText\n\n### A detail\n\n## Second section\n');
    expect(toc).toEqual([
      { id: 'first-section', text: 'First section', level: 2 },
      { id: 'a-detail', text: 'A detail', level: 3 },
      { id: 'second-section', text: 'Second section', level: 2 },
    ]);
  });

  it('ignores headings inside fenced code blocks', () => {
    const body = ['## Real heading', '', '```bash', '# a shell comment', '## not a heading', '```', '', '## Another'].join('\n');
    expect(extractToc(body).map((entry) => entry.id)).toEqual(['real-heading', 'another']);
  });

  it('ignores MDX comments', () => {
    const body = ['{/*', '## hidden', '*/}', '## visible'].join('\n');
    expect(extractToc(body).map((entry) => entry.id)).toEqual(['visible']);
  });

  it('strips inline markdown from the label', () => {
    const toc = extractToc('## The `compile` **step** and [links](https://example.com)');
    expect(toc[0]).toEqual({ id: 'the-compile-step-and-links', text: 'The compile step and links', level: 2 });
  });

  it('suffixes duplicate ids the way rehype-slug does', () => {
    const toc = extractToc('## Repeated\n\n## Repeated\n\n## Repeated');
    expect(toc.map((entry) => entry.id)).toEqual(['repeated', 'repeated-1', 'repeated-2']);
  });

  it('returns nothing for a post without subheadings', () => {
    expect(extractToc('Just a paragraph.\n\nAnd another.')).toEqual([]);
  });
});

describe('slugify', () => {
  it('produces lowercase, hyphenated slugs', () => {
    expect(slugify('Replication & Reproducibility')).toBe('replication-and-reproducibility');
    expect(slugify('  Spaces   everywhere  ')).toBe('spaces-everywhere');
  });
});
