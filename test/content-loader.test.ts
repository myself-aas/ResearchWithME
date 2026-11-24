import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  estimateReadingTime,
  loadPosts,
  toPlainText,
} from '@/lib/content/posts';

let dir: string;

function writePost(name: string, frontmatter: string, body = 'Body paragraph.') {
  writeFileSync(path.join(dir, name), `---\n${frontmatter}\n---\n\n${body}\n`, 'utf8');
}

const base = (overrides: Record<string, string> = {}) => {
  const fields = {
    title: '"A post"',
    description: '"A description long enough to pass validation."',
    date: '"2026-11-01"',
    ...overrides,
  };
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'rwm-content-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('loadPosts', () => {
  it('returns an empty list when the directory does not exist', () => {
    expect(loadPosts({ dir: path.join(dir, 'missing') })).toEqual([]);
  });

  it('reads frontmatter, derives the slug from the file name, and formats the href', () => {
    writePost('hello-world.mdx', base({ tags: '["MDX", "writing"]' }));
    const [post] = loadPosts({ dir });

    expect(post.slug).toBe('hello-world');
    expect(post.href).toBe('/blog/hello-world');
    expect(post.title).toBe('A post');
    expect(post.date).toBe('2026-11-01');
    expect(post.tags).toEqual(['mdx', 'writing']);
    expect(post.readingTimeMinutes).toBe(1);
    expect(post.wordCount).toBeGreaterThan(0);
  });

  it('sorts newest first and breaks ties by slug', () => {
    writePost('b-post.mdx', base({ date: '"2026-01-02"' }));
    writePost('a-post.mdx', base({ date: '"2026-01-02"' }));
    writePost('newest.mdx', base({ date: '"2026-05-01"' }));

    expect(loadPosts({ dir }).map((post) => post.slug)).toEqual(['newest', 'a-post', 'b-post']);
  });

  it('excludes drafts unless asked for them', () => {
    writePost('published.mdx', base());
    writePost('draft.mdx', `${base()}\ndraft: true`);

    expect(loadPosts({ dir, includeDrafts: false }).map((post) => post.slug)).toEqual(['published']);
    expect(loadPosts({ dir, includeDrafts: true }).map((post) => post.slug)).toEqual(['draft', 'published']);
  });

  it('honours a slug override', () => {
    writePost('file-name.mdx', `${base()}\nslug: "custom-url"`);
    expect(loadPosts({ dir })[0].slug).toBe('custom-url');
  });

  it('rejects duplicate slugs with both file names in the message', () => {
    writePost('one.mdx', `${base()}\nslug: "same"`);
    writePost('two.mdx', `${base()}\nslug: "same"`);

    expect(() => loadPosts({ dir })).toThrow(/Duplicate slug "same".*one\.mdx.*two\.mdx/s);
  });

  it('rejects invalid frontmatter with the file name and the field', () => {
    writePost('broken.mdx', base({ title: '""' }));

    expect(() => loadPosts({ dir })).toThrow(/Invalid frontmatter in content\/posts\/broken\.mdx/);
    expect(() => loadPosts({ dir })).toThrow(/title/);
  });

  it('requires alt text whenever a cover is set', () => {
    writePost('cover.mdx', `${base()}\ncover: "/images/folio-hero.jpeg"`);
    expect(() => loadPosts({ dir })).toThrow(/coverAlt/);
  });

  it('rejects an unknown frontmatter key instead of silently ignoring it', () => {
    writePost('typo.mdx', `${base()}\ntgas: ["methodology"]`);
    expect(() => loadPosts({ dir })).toThrow(/Unrecognized key/);
  });

  it('ignores non-MDX files', () => {
    writePost('notes.txt' as string, base());
    expect(loadPosts({ dir })).toEqual([]);
  });
});

describe('reading time', () => {
  it('rounds up to whole minutes with a one-minute floor', () => {
    expect(estimateReadingTime('')).toEqual({ words: 0, minutes: 1 });
    expect(estimateReadingTime('word '.repeat(226)).minutes).toBe(2);
    expect(estimateReadingTime('word '.repeat(200)).minutes).toBe(1);
  });
});

describe('toPlainText', () => {
  it('strips code, imports, components, and link syntax', () => {
    const body = [
      'import Thing from "./Thing"',
      '',
      'Read [the paper](https://example.com).',
      '',
      '```ts',
      'const x = 1;',
      '```',
      '',
      '<Callout tone="note">Note text.</Callout>',
    ].join('\n');

    const text = toPlainText(body);
    expect(text).toContain('Read the paper');
    expect(text).not.toContain('const x');
    expect(text).not.toContain('Callout');
    expect(text).not.toContain('---');
  });
});
