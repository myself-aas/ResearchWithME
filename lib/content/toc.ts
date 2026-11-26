/**
 * Table-of-contents extraction.
 *
 * Headings are read straight from the MDX source so the table of contents can
 * render in the same pass as the page — no browser measurement, no layout
 * shift, and it works with JavaScript disabled. The ids mirror the ones
 * `rehype-slug` writes onto the rendered headings (GitHub-style slugger,
 * including the `-1`, `-2` suffixes for repeated titles).
 */

import { slugify } from './slug';

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\{#[^}]+\}/g, '')
    .trim();
}

/**
 * Walks the source line by line, skipping fenced code blocks and HTML/MDX
 * blocks so a `# comment` inside a shell snippet never becomes a heading.
 */
export function extractToc(body: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const seen = new Map<string, number>();
  let inFence = false;
  let fenceMarker = '';
  let inComment = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trimEnd();

    if (inComment) {
      if (line.includes('*/')) inComment = false;
      continue;
    }
    if (line.trimStart().startsWith('{/*')) {
      if (!line.includes('*/}')) inComment = true;
      continue;
    }

    const fence = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const text = stripInlineMarkdown(match[2]);
    if (!text) continue;

    const base = slugify(text);
    if (!base) continue;

    const duplicate = seen.get(base) ?? 0;
    seen.set(base, duplicate + 1);
    entries.push({ id: duplicate === 0 ? base : `${base}-${duplicate}`, text, level });
  }

  return entries;
}
