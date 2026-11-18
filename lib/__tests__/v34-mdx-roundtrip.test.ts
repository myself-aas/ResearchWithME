import { describe, expect, it } from 'vitest';
import {
  parseResearchDocumentFromMdx,
  looksLikeMdxDocument,
} from '@/lib/v34/mdx-roundtrip';
import {
  serializeResearchDocumentToMdx,
  type ResearchDocument,
} from '@/lib/v34/contracts';

function baseDocument(): ResearchDocument {
  return {
    schemaVersion: '1.0',
    id: 'draft-1',
    title: 'Reproducibility of sparse attention',
    authorId: 'researcher-1',
    workspaceId: 'personal',
    version: 3,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    blocks: [],
  };
}

const FULL_DOCUMENT: ResearchDocument = {
  ...baseDocument(),
  blocks: [
    { id: 'b1', type: 'paragraph', text: 'Attention sparsity is usually reported without seeds.' },
    { id: 'b2', type: 'heading', text: 'Methods', level: 2 },
    {
      id: 'b3',
      type: 'evidence',
      text: 'Table 3 reports three seeds with overlapping intervals.',
      sourceId: 'src-1',
      locator: 'Table 3',
      limitation: 'Single hardware generation.',
    },
    { id: 'b4', type: 'claim', text: 'Speedups do not replicate at batch size 1.', relation: 'QUALIFIES' },
    { id: 'b5', type: 'limitation', text: 'Only one model family was tested.' },
    { id: 'b6', type: 'question', text: 'Does sparsity help at long context?' },
    { id: 'b7', type: 'citation', text: 'arXiv:2501.12948', locator: '§4.2' },
    { id: 'b8', type: 'code', text: 'pip install sparse-attn\npython bench.py', language: 'bash' },
    { id: 'b9', type: 'callout', text: 'Metrics use the authors’ own harness.' },
    {
      id: 'b10',
      type: 'tool_review',
      text: 'Repository ships a reproducible benchmark.',
      repoUrl: 'https://github.com/example/sparse',
      licenseSpdx: 'Apache-2.0',
    },
    { id: 'b11', type: 'table', text: '| Metric | Baseline | Observed |\n| --- | --- | --- |\n| Speed | 1.0x | 1.4x |' },
    { id: 'b12', type: 'equation', text: 'A = softmax(QK^T / sqrt(d))' },
    { id: 'b13', type: 'diagram', text: 'graph LR\n  Source --> Evidence' },
  ],
};

describe('MDX round-trip for the shared editor', () => {
  it('re-serializes to the exact same MDX after parsing', () => {
    const mdx = serializeResearchDocumentToMdx(FULL_DOCUMENT);
    const parsed = parseResearchDocumentFromMdx(mdx, baseDocument());
    expect(serializeResearchDocumentToMdx(parsed)).toBe(mdx);
    expect(parsed.title).toBe(FULL_DOCUMENT.title);
    expect(parsed.blocks).toHaveLength(FULL_DOCUMENT.blocks.length);
    expect(parsed.blocks.map((block) => block.type)).toEqual(
      FULL_DOCUMENT.blocks.map((block) => block.type),
    );
  });

  it('keeps evidence metadata, claim relations, and code languages', () => {
    const parsed = parseResearchDocumentFromMdx(
      serializeResearchDocumentToMdx(FULL_DOCUMENT),
      baseDocument(),
    );
    const evidence = parsed.blocks.find((block) => block.type === 'evidence');
    expect(evidence).toMatchObject({ sourceId: 'src-1', locator: 'Table 3' });
    const claim = parsed.blocks.find((block) => block.type === 'claim');
    expect(claim).toMatchObject({ relation: 'QUALIFIES' });
    const code = parsed.blocks.find((block) => block.type === 'code');
    expect(code).toMatchObject({ language: 'bash' });
    const tool = parsed.blocks.find((block) => block.type === 'tool_review');
    expect(tool).toMatchObject({ repoUrl: 'https://github.com/example/sparse', licenseSpdx: 'Apache-2.0' });
  });

  it('does not cut code fences or math at their internal blank lines', () => {
    const doc: ResearchDocument = {
      ...baseDocument(),
      blocks: [
        { id: 'c1', type: 'code', text: 'line one\n\nline two after a gap', language: 'text' },
        { id: 'c2', type: 'equation', text: 'a = b\n\nc = d' },
      ],
    };
    const mdx = serializeResearchDocumentToMdx(doc);
    const parsed = parseResearchDocumentFromMdx(mdx, baseDocument());
    expect(parsed.blocks).toHaveLength(2);
    expect(parsed.blocks[0]).toMatchObject({ type: 'code', text: 'line one\n\nline two after a gap' });
    expect(parsed.blocks[1]).toMatchObject({ type: 'equation' });
  });

  it('reuses existing block ids by position when the type still matches', () => {
    const mdx = serializeResearchDocumentToMdx(FULL_DOCUMENT);
    const parsed = parseResearchDocumentFromMdx(mdx, FULL_DOCUMENT);
    expect(parsed.blocks.map((block) => block.id)).toEqual(FULL_DOCUMENT.blocks.map((block) => block.id));
    expect(parsed.version).toBe(FULL_DOCUMENT.version);
  });

  it('treats an untitled document and unsupported quotes safely', () => {
    const mdx = '> A pasted quotation that is not a labelled block.';
    const parsed = parseResearchDocumentFromMdx(mdx, { ...baseDocument(), title: '' });
    expect(parsed.title).toBe('');
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0]).toMatchObject({
      type: 'paragraph',
      text: 'A pasted quotation that is not a labelled block.',
    });
    expect(looksLikeMdxDocument(mdx)).toBe(true);
    expect(looksLikeMdxDocument('  ')).toBe(false);
  });

  it('unescapes entities the serializer introduced', () => {
    const doc: ResearchDocument = {
      ...baseDocument(),
      blocks: [{ id: 'p1', type: 'paragraph', text: 'n < 30 and p > 0.05' }],
    };
    const mdx = serializeResearchDocumentToMdx(doc);
    expect(mdx).toContain('&lt;');
    const parsed = parseResearchDocumentFromMdx(mdx, baseDocument());
    expect(parsed.blocks[0]).toMatchObject({ type: 'paragraph', text: 'n < 30 and p > 0.05' });
  });
});
