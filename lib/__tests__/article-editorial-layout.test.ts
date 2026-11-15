import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routes = ['app/post/[slug]/page.tsx', 'cloudflare-pages/src/routes/post.tsx'];

describe('editorial article layout across builds', () => {
  for (const path of routes) {
    it(`${path} retains article content and inline reading controls`, () => {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain('aria-labelledby="article-title"');
      expect(source).toContain('article.keyTakeaways.map');
      expect(source).toContain('<MarkdownBody');
      expect(source).toContain('<ArticleInteractions');
      expect(source).toContain('<DeferredDiscussion');
      expect(source).toMatch(/<ReadingProgressDock\s+inline\b/);
      expect(source).toContain('rounded-2xl border border-line bg-surface');
    });
  }
});
