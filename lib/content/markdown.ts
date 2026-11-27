import { absoluteUrl } from '../seo';
import { AUTHOR, SITE } from '../site';
import type { Post } from './types';

/**
 * The Markdown representation of an essay: YAML frontmatter (title,
 * description, dates, author, canonical, license, tags) followed by the
 * raw MDX body.
 *
 * This is the single source for the article-as-Markdown text. Both the
 * per-essay `/blog/{slug}/markdown` route and the MCP `get_article` tool
 * render through it, so the two can never diverge.
 */
export function buildArticleMarkdown(post: Post): string {
  const frontmatter = [
    '---',
    `title: "${post.title.replace(/"/g, '\\"')}"`,
    `description: "${post.description.replace(/"/g, '\\"')}"`,
    `date: ${post.date}`,
    ...(post.updated ? [`updated: ${post.updated}`] : []),
    `author: ${AUTHOR.name}`,
    `canonical: ${absoluteUrl(post.href)}`,
    `license: ${SITE.licenseUrl}`,
    ...(post.tags.length ? [`tags: [${post.tags.join(', ')}]`] : []),
    '---',
    '',
  ].join('\n');

  return `${frontmatter}${post.body}\n`;
}
