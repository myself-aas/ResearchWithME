/**
 * MDX → ResearchDocument round-trip (v3.4 §10.6).
 *
 * `serializeResearchDocumentToMdx` is deterministic, so it can also be read
 * back. This module parses that exact dialect (headings, paragraphs, labelled
 * blockquotes, citation list items, fenced code/Mermaid, `$$` equations, pipe
 * tables) so the scholarly workspace can offer the same rich MDX editing surface
 * the writer studio uses, without losing the structured block model.
 *
 * Guarantee exercised by tests: for any document the serializer produced,
 * `serialize(parse(serialize(doc))) === serialize(doc)`. Fields the dialect
 * cannot express are not fabricated.
 */
import type { ResearchBlock, ResearchDocument } from './contracts';

const RELATIONS = ['SUPPORTS', 'CONTRADICTS', 'QUALIFIES'] as const;

function unescapeMdxText(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function parseMeta(meta: string | undefined): Record<string, string> {
  const pairs: Record<'source' | 'locator', string> = { source: '', locator: '' };
  if (!meta) return pairs;
  for (const match of meta.matchAll(/(source|locator)="([^"]*)"/g)) {
    pairs[match[1] as 'source' | 'locator'] = match[2];
  }
  return pairs;
}

function stripBlockquote(chunk: string): string[] {
  return chunk
    .split('\n')
    .map((line) => line.replace(/^>\s?/, ''))
    .filter((line) => line.length > 0);
}

interface ParsedChunk {
  block: Omit<ResearchBlock, 'id'> | null;
  /** A follow-up `_Limitation:_` line that belongs to the previous evidence block. */
  limitation?: string;
}

function parseChunk(chunk: string): ParsedChunk {
  const fenced = /^```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n```$/.exec(chunk);
  if (fenced) {
    const language = fenced[1] || 'text';
    return {
      block:
        language === 'mermaid'
          ? { type: 'diagram', text: fenced[2] }
          : { type: 'code', text: fenced[2], language },
    };
  }

  const equation = /^\$\$\n([\s\S]*?)\n\$\$$/.exec(chunk);
  if (equation) return { block: { type: 'equation', text: equation[1] } };

  const heading = /^(#{2,6})\s+([\s\S]*)$/.exec(chunk);
  if (heading) {
    const level = Math.min(4, Math.max(2, heading[1].length));
    return { block: { type: 'heading', text: unescapeMdxText(heading[2]), level } };
  }

  if (chunk.startsWith('>')) {
    const lines = stripBlockquote(chunk);
    const first = lines[0] ?? '';
    const body = unescapeMdxText(lines.slice(1).join('\n'));

    const evidence = /^\*\*Evidence\*\*(?:\s*\((.*)\))?$/.exec(first);
    if (evidence) {
      const meta = parseMeta(evidence[1]);
      return {
        block: {
          type: 'evidence',
          text: body,
          ...(meta.source ? { sourceId: meta.source } : {}),
          ...(meta.locator ? { locator: meta.locator } : {}),
        },
      };
    }

    const claim = /^\*\*Claim(?:\s*\[(SUPPORTS|CONTRADICTS|QUALIFIES)\])?(?:\s*\[([^\]]*)\])?\*\*$/.exec(first);
    if (claim) {
      const relation = RELATIONS.find((value) => value === claim[1]);
      return {
        block: {
          type: 'claim',
          text: body,
          ...(relation ? { relation } : {}),
        },
      };
    }

    if (/^\*\*Limitation\*\*$/.test(first)) return { block: { type: 'limitation', text: body } };
    if (/^\*\*Open Research Question\*\*$/.test(first)) {
      return { block: { type: 'question', text: body } };
    }
    if (/^\*\*Note\*\*$/.test(first)) return { block: { type: 'callout', text: body } };

    const tool = /^\*\*Tool Review\*\*(?:\s*\((.*)\))?$/.exec(first);
    if (tool) {
      const meta = tool[1] ?? '';
      const repo = /Repository:\s*([^·]+)/.exec(meta)?.[1]?.trim();
      const license = /License:\s*([^·]+)/.exec(meta)?.[1]?.trim();
      return {
        block: {
          type: 'tool_review',
          text: body,
          ...(repo ? { repoUrl: repo } : {}),
          ...(license ? { licenseSpdx: license } : {}),
        },
      };
    }

    // An unlabelled quote is prose the author pasted; keep it as a paragraph
    // rather than dropping the text.
    return { block: { type: 'paragraph', text: unescapeMdxText(lines.join('\n')) } };
  }

  const limitation = /^_Limitation:_\s*([\s\S]*)$/.exec(chunk);
  if (limitation) return { block: null, limitation: limitation[1].trim() };

  const citation = /^-\s+Citation:\s+([\s\S]*)$/.exec(chunk);
  if (citation) {
    const raw = citation[1];
    const splitAt = raw.lastIndexOf(' — ');
    if (splitAt > -1) {
      return {
        block: {
          type: 'citation',
          text: unescapeMdxText(raw.slice(0, splitAt)),
          locator: raw.slice(splitAt + 3).trim(),
        },
      };
    }
    return { block: { type: 'citation', text: unescapeMdxText(raw) } };
  }

  if (chunk.startsWith('|')) return { block: { type: 'table', text: chunk } };

  return { block: { type: 'paragraph', text: unescapeMdxText(chunk) } };
}

/**
 * Splits MDX into serializer-equivalent chunks (blank-line separated) without
 * cutting through fenced code or `$$` math, both of which may contain blank
 * lines of their own.
 */
function toChunks(mdx: string): string[] {
  const lines = mdx.replace(/\r\n/g, '\n').split('\n');
  const chunks: string[] = [];
  let buffer: string[] = [];
  let inFence = false;
  let inMath = false;

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) chunks.push(text);
    buffer = [];
  };

  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    else if (!inFence && /^\$\$\s*$/.test(line)) inMath = !inMath;

    if (!line.trim() && !inFence && !inMath) {
      flush();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return chunks;
}

/**
 * Rebuilds a document from its MDX. Existing block ids are reused by position
 * when the block type still matches, so autosave versioning and React keys stay
 * stable across an "Apply to blocks" round-trip.
 */
export function parseResearchDocumentFromMdx(
  mdx: string,
  base: ResearchDocument,
): ResearchDocument {
  const chunks = toChunks(mdx);
  let title = base.title;
  let startIndex = 0;

  const first = chunks[0];
  if (first && /^#\s+/.test(first) && !first.includes('\n')) {
    title = unescapeMdxText(first.replace(/^#\s+/, '')).trim().slice(0, 260);
    startIndex = 1;
  }

  const blocks: ResearchBlock[] = [];
  for (let index = startIndex; index < chunks.length; index += 1) {
    const parsed = parseChunk(chunks[index]);
    if (parsed.limitation) {
      const previous = blocks[blocks.length - 1];
      if (previous && previous.type === 'evidence') {
        blocks[blocks.length - 1] = { ...previous, limitation: parsed.limitation };
      }
      continue;
    }
    if (!parsed.block) continue;
    const position = blocks.length;
    const candidate = base.blocks[position];
    const id =
      candidate && candidate.type === parsed.block.type ? candidate.id : `blk-mdx-${position + 1}`;
    blocks.push({ ...parsed.block, id } as ResearchBlock);
  }

  return {
    ...base,
    title,
    blocks: blocks.slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
}

/** Cheap guard used by the UI before offering "Apply". */
export function looksLikeMdxDocument(mdx: string): boolean {
  return mdx.trim().length > 0;
}
