import { createPlateEditor } from 'platejs/react';
import { BasicBlocksPlugin, BasicMarksPlugin } from '@platejs/basic-nodes/react';
import { ListPlugin } from '@platejs/list/react';
import { LinkPlugin } from '@platejs/link/react';
import { CodeBlockPlugin } from '@platejs/code-block/react';
import { MarkdownPlugin } from '@platejs/markdown';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

// Only enable visual editing when every Markdown node is represented by our
// editor. Everything else remains editable in the lossless source mode.
const supportedNodes = new Set([
  'root', 'paragraph', 'text', 'heading', 'strong', 'emphasis', 'inlineCode',
  'delete', 'blockquote', 'list', 'listItem', 'link', 'code', 'thematicBreak',
]);

export const platePlugins = [
  BasicBlocksPlugin, BasicMarksPlugin, ListPlugin, LinkPlugin, CodeBlockPlugin,
  MarkdownPlugin.configure({ options: { remarkPlugins: [remarkGfm] } }),
];

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  const node = value as Record<string, unknown>;
  if (typeof node.type === 'string' && !supportedNodes.has(node.type)) throw new Error('Unsupported Markdown');
  return Object.fromEntries(Object.entries(node)
    .filter(([key]) => key !== 'position' && key !== 'data')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => [key, normalize(child)]));
}

/** Refuse visual mode unless Plate can round-trip this document semantically. */
export function canEditVisually(markdown: string): boolean {
  if (!markdown.trim()) return true;
  try {
    const parser = unified().use(remarkParse).use(remarkGfm);
    const before = normalize(parser.parse(markdown));
    const editor = createPlateEditor({ plugins: platePlugins });
    editor.tf.setValue(editor.getApi(MarkdownPlugin).markdown.deserialize(markdown));
    const after = normalize(parser.parse(editor.getApi(MarkdownPlugin).markdown.serialize()));
    return JSON.stringify(before) === JSON.stringify(after);
  } catch {
    return false;
  }
}
