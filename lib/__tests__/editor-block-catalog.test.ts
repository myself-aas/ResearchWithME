import { describe, expect, it } from 'vitest';
import {
  EDITOR_BLOCKS,
  EDITOR_GROUPS,
  MDX_COMPONENT_TEMPLATES,
  blocksInGroup,
  catalogCoversMdxAllowlist,
  filterBlocks,
} from '@/lib/editor/block-catalog';
import { ALLOWED_MDX_COMPONENTS, validateAndSanitizeMdx } from '@/lib/v34/mdx-security';

describe('editor block catalog', () => {
  it('covers the whole MDX allowlist, with no invented components', () => {
    expect(catalogCoversMdxAllowlist()).toBe(true);
    expect(new Set(MDX_COMPONENT_TEMPLATES.map((template) => template.name))).toEqual(ALLOWED_MDX_COMPONENTS);
  });

  it.each(MDX_COMPONENT_TEMPLATES.map((template) => [template.name, template.snippet] as const))(
    'inserts a security-safe %s template',
    (_name, snippet) => {
      const result = validateAndSanitizeMdx(snippet);
      expect(result.safe, result.violations.map((violation) => violation.message).join('; ')).toBe(true);
      expect(result.sanitizedMdx).toBe(snippet);
    },
  );

  it('includes the full heading scale and core structural blocks', () => {
    const headingLevels = blocksInGroup('headings')
      .filter((block) => block.kind === 'heading')
      .map((block) => block.level);
    expect(headingLevels).toEqual([1, 2, 3, 4, 5, 6]);
    for (const id of ['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      expect(EDITOR_BLOCKS.some((block) => block.id === id)).toBe(true);
    }
    for (const id of ['bullet-list', 'numbered-list', 'blockquote', 'code-block', 'divider', 'image', 'table', 'equation', 'mermaid']) {
      expect(EDITOR_BLOCKS.some((block) => block.id === id)).toBe(true);
    }
  });

  it('gives every insertable block a non-empty snippet or a visual transform', () => {
    const missing = EDITOR_BLOCKS.filter((block) => !block.snippet && !['paragraph', 'heading', 'bullet', 'number', 'quote', 'code', 'divider'].includes(block.kind));
    expect(missing).toEqual([]);
  });

  it('filters by label, description, and id', () => {
    expect(filterBlocks('evidence').some((block) => block.label === 'Evidence callout')).toBe(true);
    expect(filterBlocks('table').some((block) => block.label === 'Table')).toBe(true);
    expect(filterBlocks('citation ref').some((block) => block.label === 'Citation reference')).toBe(true);
    expect(filterBlocks('not-a-real-block')).toEqual([]);
    expect(EDITOR_GROUPS).toEqual(['headings', 'blocks', 'mdx']);
  });
});
