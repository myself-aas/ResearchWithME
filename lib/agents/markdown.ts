import TurndownService from 'turndown';

/**
 * Agent-ready markdown conversion.
 *
 * Implements Cloudflare's "Markdown for Agents" output contract at the
 * application level, so `Accept: text/markdown` requests get a markdown
 * representation of a page without depending on zone-level conversion:
 *
 * 1. YAML frontmatter from supported `<meta>` tags (standard name/ forms win
 *    over og:property fallbacks; only fields with values are emitted).
 * 2. Body markdown converted from the document body. Non-content elements
 *    (`script`, `style`, `head`, `header`, `footer`) are stripped first, per
 *    Cloudflare's HTML pre-processing.
 * 3. JSON-LD blocks preserved as a single fenced `json` block at the end.
 *
 * Token counts use the site-wide ~4-chars-per-token estimate, matching the
 * per-essay `/markdown` route so agents see one consistent budget signal.
 */

/** Estimate token count the same way the essay markdown route does. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface PageMetadata {
  title?: string;
  description?: string;
  image?: string;
}

interface MetaTag {
  name?: string;
  property?: string;
  content?: string;
}

const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(ATTR)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return attrs;
}

function readMeta(html: string): MetaTag[] {
  const tags: MetaTag[] = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    tags.push({ name: attrs.name, property: attrs.property, content: attrs.content });
  }
  return tags;
}

/**
 * Extract supported metadata. Standard `name` forms take priority over the
 * Open Graph fallbacks, matching Cloudflare's precedence.
 */
export function extractPageMetadata(html: string): PageMetadata {
  const meta = readMeta(html);
  const byName = (key: string) => meta.find((tag) => tag.name?.toLowerCase() === key)?.content;
  const byProperty = (key: string) =>
    meta.find((tag) => tag.property?.toLowerCase() === key)?.content;

  const title = byName('title') || byProperty('og:title');
  const description = byName('description') || byProperty('og:description');
  const image = byProperty('og:image');

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
  };
}

/** Collect every `<script type="application/ld+json">` block, in document order. */
export function extractJsonLd(html: string): string[] {
  const blocks: string[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = match[1].trim();
    if (body) blocks.push(body);
  }
  return blocks;
}

/**
 * Strip non-content elements before conversion, per Cloudflare's HTML
 * pre-processing: script and style are ignored, head/header/footer removed.
 * HTML comments are dropped as well — they carry no rendered content.
 */
export function stripNonContent(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
}

/** Render the YAML frontmatter block, or an empty string when no metadata exists. */
export function renderFrontmatter(metadata: PageMetadata): string {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '';
  const lines = entries.map(([key, value]) => `${key}: "${value.replace(/"/g, '\\"')}"`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

/** Render collected JSON-LD blocks as a single fenced json code block. */
export function renderJsonLd(blocks: string[]): string {
  if (blocks.length === 0) return '';
  const joined = blocks.join('\n');
  const fence = joined.includes('```') ? '````' : '```';
  return `\n${fence}json\n${joined}\n${fence}\n`;
}

/** Tidy converter output: drop trailing whitespace and collapse excess blank lines. */
function tidy(markdown: string): string {
  return markdown
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * HTML-to-Markdown converter. Turndown's defaults are switched to the
 * conventional ATX headings and `-` bullets so the output matches the
 * Cloudflare "Markdown for Agents" shape (`# Heading`, `- item`).
 */
const converter = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

export interface AgentMarkdown {
  markdown: string;
  tokens: number;
}

/** Convert a full HTML document to the agent-ready markdown representation. */
export function htmlToAgentMarkdown(html: string): AgentMarkdown {
  const metadata = extractPageMetadata(html);
  const jsonLd = extractJsonLd(html);

  const stripped = stripNonContent(html);
  const bodyMatch = stripped.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : stripped;

  const frontmatter = renderFrontmatter(metadata);
  const converted = tidy(converter.turndown(body));
  const jsonLdBlock = renderJsonLd(jsonLd);

  const markdown = `${frontmatter}${converted}${jsonLdBlock}`.trim() + '\n';
  return { markdown, tokens: estimateTokens(markdown) };
}
