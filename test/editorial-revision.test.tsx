import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { loadPosts } from '@/lib/content/load';
import { publishedPosts } from '@/lib/content/snapshot.generated';
import manifest from '@/docs/writing/revision-manifest.json';
import publication from '@/docs/writing/publication-manifest.json';
import sharp from 'sharp';
import { BENCH_QUIZ, BENCH_RESULT_ROWS } from '@/lib/post/reproducing-a-benchmark-that-did-not-survive';
import { BenchResultsMatrix } from '@/components/post/bench-figures';

const changed = manifest.posts.filter(post => post.changed);
const readPost = (file: string) => matter(readFileSync(`content/posts/${file}`, 'utf8'));

describe('supplied deep-dive editorial rollout', () => {
  it('preserves the supplied source documents byte-for-byte', () => {
    for (const source of manifest.sources) {
      expect(createHash('sha256').update(readFileSync(`docs/writing/sources/${source.file}`)).digest('hex')).toBe(source.sha256);
    }
  });

  it('preserves dates, URLs and figures while publishing only the author-approved drafts', () => {
    const loaded = loadPosts({ includeDrafts: true });
    for (const original of manifest.posts) {
      const post = loaded.find(post => post.slug === original.slug);
      expect(post, original.file).toBeDefined();
      expect(post?.date).toBe(original.date);
      const authorized = publication.covers.some(cover => cover.slug === original.slug);
      expect(post?.draft).toBe(authorized ? false : original.draft);
      const { content } = readPost(original.file);
      for (const component of original.components) expect(content, `${original.file}: ${component}`).toMatch(new RegExp(`<${component}\\b`));
      if (!original.changed) {
        expect(createHash('sha256').update(readFileSync(`content/posts/${original.file}`)).digest('hex')).toBe(original.beforeSha256);
      }
    }
    const expected = manifest.posts.filter(post => !post.draft || publication.covers.some(cover => cover.slug === post.slug));
    expect(publishedPosts.map(post => post.slug).sort()).toEqual(expected.map(post => post.slug).sort());
    expect(publication.covers.map(cover => cover.slug).sort()).toEqual(manifest.posts.filter(post => post.draft).map(post => post.slug).sort());
  });

  it('ships a distinct optimized, described cover for each of the 17 approved posts', async () => {
    expect(publication.covers).toHaveLength(17);
    const hashes = new Set<string>();
    for (const cover of publication.covers) {
      const { data } = readPost(`${cover.slug}.mdx`);
      expect(data.draft).toBe(false);
      expect(data.cover).toBe(cover.cover);
      expect(data.coverAlt).toBe(cover.alt);
      const image = readFileSync(`public${cover.cover}`);
      hashes.add(createHash('sha256').update(image).digest('hex'));
      expect(image.byteLength).toBeLessThan(150_000);
      const meta = await sharp(image).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([1200, 675, 'webp']);
    }
    expect(hashes.size).toBe(17);
  });

  it.each(changed)('$file has a bounded lead, valid update, FAQs, evidence and internal context links', ({ file }) => {
    const { data, content } = readPost(file);
    const leadWords = content.trim().split(/\n\s*\n/)[0].split(/\s+/).length;
    expect(leadWords).toBeGreaterThanOrEqual(40);
    expect(leadWords).toBeLessThanOrEqual(60);
    expect(data.updated).toBe(manifest.date);
    expect(data.faq.length).toBeGreaterThanOrEqual(3);
    expect(new Set([...content.matchAll(/\]\((https?:[^)]+)\)/g)].map(m => m[1])).size).toBeGreaterThanOrEqual(3);
    expect(new Set([...content.matchAll(/\]\((\/[^)]+)\)/g)].map(m => m[1])).size).toBeGreaterThanOrEqual(3);
    expect(content).not.toMatch(/\]\(\/(?:author|category)\//);
    expect(content).not.toContain('Visual / Interactive Placeholder');
    // Block-level figure bindings must not become children of a Markdown paragraph.
    expect(content).not.toMatch(/^<[A-Z]\w*[ \t]*\/>[ \t]+\S/gm);
    expect(data).not.toHaveProperty('keywords');
    expect(data).not.toHaveProperty('readingTime');
    expect(content).toMatch(/## (?:Agent & )?Engineering [Qq]uick-[Ss]pec/);
    expect(content).toMatch(/## (?:Step-by-Step Reproducible Engineering Playbook|Reproduction playbook)/);
    expect(content).toMatch(/## Pre-(?:Deployment Audit Checklist|publication audit)/);
    expect(content).toMatch(/## Verdict/);
  });

  it('does not present benchmark fixtures as independently reproduced measurements', () => {
    const article = readPost('reproducing-a-benchmark-that-did-not-survive.mdx').content;
    expect(article).toContain('unverified benchmark scenario');
    expect(article).not.toContain('I sent the harness');
    expect(renderToStaticMarkup(<BenchResultsMatrix />)).toContain('not measured results');
    expect(BENCH_RESULT_ROWS.every(row => row.label.startsWith('Illustrative'))).toBe(true);
    expect(JSON.stringify(BENCH_QUIZ)).not.toContain('v0.9.4-notes');
  });

  it('renders math as readable notation without requiring a math/diagram runtime', () => {
    const article = readPost('prithvi-eo-2-0-multi-temporal-foundation-model.mdx').content;
    expect(article).not.toMatch(/\$\$|\\frac\{|```mermaid/);
    expect(article).toContain('N = (T / t) × (H / h) × (W / w)');
    expect(article).toContain('not a measured end-to-end speedup');
    expect(article).toContain('not a complete configuration');
    expect(article).toContain('separately tuned experiment');
  });
});
