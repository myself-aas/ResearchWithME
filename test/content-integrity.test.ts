import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import { frontmatterSchema } from '@/lib/content/schema';
import { loadPosts } from '@/lib/content/posts';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const posts = readdirSync(POSTS_DIR).filter((file) => file.endsWith('.mdx'));

describe('content/posts integrity', () => {
  it('contains at least one post', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it.each(posts)('%s has valid frontmatter', (file) => {
    const raw = readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data } = matter(raw);
    const result = frontmatterSchema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `${file}: ${result.error.issues.map((issue) => `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`).join('; ')}`,
      );
    }
    expect(result.data.title.length).toBeGreaterThan(0);
  });

  it.each(posts)('%s compiles as MDX with the site plugins', async (file) => {
    const raw = readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { content } = matter(raw);

    await expect(
      compile(content, {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'append' }], rehypeHighlight],
      }),
    ).resolves.toBeTruthy();
  });

  it('has unique slugs across drafts and published posts', () => {
    const loaded = loadPosts({ dir: POSTS_DIR, includeDrafts: true });
    const slugs = loaded.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
