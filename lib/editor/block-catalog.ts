import { ALLOWED_MDX_COMPONENTS } from '@/lib/v34/mdx-security';

export type EditorBlockGroup = 'headings' | 'blocks' | 'mdx';

export type EditorBlockKind =
  | 'paragraph'
  | 'heading'
  | 'bullet'
  | 'number'
  | 'quote'
  | 'code'
  | 'divider'
  | 'image'
  | 'source';

export interface EditorBlock {
  id: string;
  group: EditorBlockGroup;
  label: string;
  description: string;
  kind: EditorBlockKind;
  /** Heading level for `kind: 'heading'`. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Markdown/MDX inserted in source mode, or when the block cannot be visual. */
  snippet?: string;
}

export interface MdxComponentTemplate {
  name: string;
  label: string;
  description: string;
  snippet: string;
}

/**
 * Every component the scholarly MDX allowlist accepts, with a safe starting
 * template. Keep this list and `ALLOWED_MDX_COMPONENTS` in sync — the catalog
 * test fails if either side grows without the other.
 */
export const MDX_COMPONENT_TEMPLATES: MdxComponentTemplate[] = [
  {
    name: 'EvidenceCallout',
    label: 'Evidence callout',
    description: 'Evidence text bound to a source and exact locator.',
    snippet: '<EvidenceCallout source="source-id" locator="p. 1">\nEvidence text\n</EvidenceCallout>\n',
  },
  {
    name: 'ClaimSummary',
    label: 'Claim summary',
    description: 'A claim and its relation to the evidence.',
    snippet: '<ClaimSummary relation="SUPPORTS">\nClaim text\n</ClaimSummary>\n',
  },
  {
    name: 'CitationRef',
    label: 'Citation reference',
    description: 'Inline pointer to an allowlisted source record.',
    snippet: '<CitationRef id="source-id" />\n',
  },
  {
    name: 'LimitationBox',
    label: 'Limitation box',
    description: 'Scope limits, caveats, and what the study cannot show.',
    snippet: '<LimitationBox>\nLimitation text\n</LimitationBox>\n',
  },
  {
    name: 'ToolReviewCard',
    label: 'Tool review card',
    description: 'Repository, licence, and a short tool assessment.',
    snippet:
      '<ToolReviewCard repository="https://github.com/owner/repo" license="MIT">\nTool review text\n</ToolReviewCard>\n',
  },
  {
    name: 'DataTable',
    label: 'Data table',
    description: 'A captioned GFM table for reported values.',
    snippet: '<DataTable caption="Table 1">\n| Column A | Column B |\n| --- | --- |\n| Value | Value |\n</DataTable>\n',
  },
  {
    name: 'EquationBlock',
    label: 'Equation block',
    description: 'A display equation with an editable LaTeX body.',
    snippet: '<EquationBlock latex="E = mc^2" />\n',
  },
  {
    name: 'DiagramBlock',
    label: 'Diagram block',
    description: 'A Mermaid diagram with a caption.',
    snippet: '<DiagramBlock caption="Figure 1">\n```mermaid\ngraph TD\n  A[Question] --> B[Evidence]\n```\n</DiagramBlock>\n',
  },
  {
    name: 'FigureBlock',
    label: 'Figure block',
    description: 'An image with alt text and a caption.',
    snippet: '<FigureBlock src="https://example.org/figure.png" alt="Figure description" caption="Figure 1" />\n',
  },
  {
    name: 'Callout',
    label: 'Callout',
    description: 'A short editorial note with a tone and title.',
    snippet: '<Callout tone="note" title="Note">\nCallout text\n</Callout>\n',
  },
];

const headingIds = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

const headingBlocks: EditorBlock[] = headingIds.map((id, index) => {
  const level = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6;
  return {
    id,
    group: 'headings',
    label: `Heading ${level}`,
    description:
      level === 1
        ? 'The document title. Use once per page.'
        : level === 2
          ? 'A major section.'
          : level === 3
            ? 'A subsection.'
            : `A level-${level} subsection, used sparingly.`,
    kind: 'heading',
    level,
    snippet: `${'#'.repeat(level)} Heading ${level}\n`,
  };
});

const paragraph: EditorBlock = {
  id: 'paragraph',
  group: 'headings',
  label: 'Paragraph',
  description: 'Plain body text.',
  kind: 'paragraph',
  snippet: '\n',
};

const blockItems: EditorBlock[] = [
  {
    id: 'bullet-list',
    group: 'blocks',
    label: 'Bulleted list',
    description: 'An unordered list of points.',
    kind: 'bullet',
    snippet: '- List item\n',
  },
  {
    id: 'numbered-list',
    group: 'blocks',
    label: 'Numbered list',
    description: 'Steps or ranked findings.',
    kind: 'number',
    snippet: '1. List item\n',
  },
  {
    id: 'blockquote',
    group: 'blocks',
    label: 'Block quote',
    description: 'A quoted passage set apart from the body.',
    kind: 'quote',
    snippet: '> Quote\n',
  },
  {
    id: 'code-block',
    group: 'blocks',
    label: 'Code block',
    description: 'A fenced code sample with an optional language.',
    kind: 'code',
    snippet: '```\ncode\n```\n',
  },
  {
    id: 'divider',
    group: 'blocks',
    label: 'Divider',
    description: 'A thematic break between sections.',
    kind: 'divider',
    snippet: '---\n',
  },
  {
    id: 'image',
    group: 'blocks',
    label: 'Image',
    description: 'Upload a figure, or insert a Markdown image URL.',
    kind: 'image',
    snippet: '![Figure description](https://example.org/figure.png)\n',
  },
  {
    id: 'table',
    group: 'blocks',
    label: 'Table',
    description: 'A GFM table. Editing switches to Markdown source.',
    kind: 'source',
    snippet: '| Column A | Column B |\n| --- | --- |\n| Value | Value |\n',
  },
  {
    id: 'equation',
    group: 'blocks',
    label: 'Equation',
    description: 'A display equation in TeX. Edits in Markdown source.',
    kind: 'source',
    snippet: '$$\nE = mc^2\n$$\n',
  },
  {
    id: 'mermaid',
    group: 'blocks',
    label: 'Mermaid diagram',
    description: 'A fenced Mermaid diagram. Edits in Markdown source.',
    kind: 'source',
    snippet: '```mermaid\ngraph TD\n  A[Question] --> B[Evidence]\n```\n',
  },
];

const mdxBlocks: EditorBlock[] = MDX_COMPONENT_TEMPLATES.map((template) => ({
  id: `mdx-${template.name}`,
  group: 'mdx',
  label: template.label,
  description: template.description,
  kind: 'source',
  snippet: template.snippet,
}));

export const EDITOR_BLOCKS: EditorBlock[] = [...headingBlocks, paragraph, ...blockItems, ...mdxBlocks];

export const EDITOR_GROUP_LABELS: Record<EditorBlockGroup, string> = {
  headings: 'Headings',
  blocks: 'Blocks',
  mdx: 'MDX components',
};

export const EDITOR_GROUPS: EditorBlockGroup[] = ['headings', 'blocks', 'mdx'];

export function blocksInGroup(group: EditorBlockGroup): EditorBlock[] {
  return EDITOR_BLOCKS.filter((block) => block.group === group);
}

export function filterBlocks(query: string): EditorBlock[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return EDITOR_BLOCKS;
  return EDITOR_BLOCKS.filter((block) =>
    `${block.label} ${block.description} ${block.id}`.toLowerCase().includes(needle),
  );
}

/** Guard for the catalog test; also documents the mapping contract. */
export function catalogCoversMdxAllowlist(): boolean {
  const catalogued = new Set(MDX_COMPONENT_TEMPLATES.map((template) => template.name));
  return catalogued.size === ALLOWED_MDX_COMPONENTS.size && [...ALLOWED_MDX_COMPONENTS].every((name) => catalogued.has(name));
}
