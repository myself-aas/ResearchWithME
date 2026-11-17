import { describe, expect, it } from 'vitest';
import {
  BLOCK_TYPES,
  serializeResearchDocumentToMdx,
  type ResearchDocument,
} from '@/lib/v34/contracts';
import { validateAndSanitizeMdx } from '@/lib/v34/mdx-security';
import { buildCitation, CITATION_FORMATS, citationFileExtension } from '@/lib/citations';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('v3.4 Wave 12 — Full Block Registry Parity, CSL-JSON Citations, ResponsiveDataTable & CI E2E Gate', () => {
  it('supports all 13 Part I §10.3 / Part III §20.1 scholarly editor blocks and serializes them safely into MDX', () => {
    for (const requiredType of [
      'paragraph',
      'heading',
      'evidence',
      'claim',
      'citation',
      'limitation',
      'question',
      'code',
      'callout',
      'tool_review',
      'table',
      'equation',
      'diagram',
    ] as const) {
      expect(BLOCK_TYPES).toContain(requiredType);
    }

    const doc: ResearchDocument = {
      schemaVersion: '1.0',
      id: 'draft-w12',
      title: 'Benchmarking Open Inference Kernels',
      authorId: 'user-1',
      workspaceId: 'personal',
      version: 1,
      createdAt: '2026-11-17T00:00:00.000Z',
      updatedAt: '2026-11-17T00:00:00.000Z',
      blocks: [
        {
          id: 'b-tool',
          type: 'tool_review',
          repoUrl: 'https://github.com/vllm-project/vllm',
          licenseSpdx: 'Apache-2.0',
          text: 'Reproducible PagedAttention throughput benchmark.',
        },
        {
          id: 'b-table',
          type: 'table',
          text: '| Engine | Tok/s |\n| --- | --- |\n| vLLM | 1420 |',
        },
        {
          id: 'b-eq',
          type: 'equation',
          text: '\\text{Latency}_{p95} \\le 500\\text{ms}',
        },
        {
          id: 'b-diag',
          type: 'diagram',
          text: 'graph LR\n  Source --> Evidence --> Claim',
        },
      ],
    };

    const mdx = serializeResearchDocumentToMdx(doc);
    expect(mdx).toContain('**Tool Review**');
    expect(mdx).toContain('Apache-2.0');
    expect(mdx).toContain('| Engine | Tok/s |');
    expect(mdx).toContain('$$\n\\text{Latency}_{p95}');
    expect(mdx).toContain('```mermaid');

    const validation = validateAndSanitizeMdx(mdx);
    expect(validation.safe).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('exposes CSL-JSON as a first-class CitationFormat with .json download extension', () => {
    expect(CITATION_FORMATS).toContain('csl-json');
    expect(citationFileExtension('csl-json')).toBe('json');

    const raw = buildCitation('csl-json', {
      title: 'Verifier-Guided Reinforcement Learning',
      author: 'Maya Lin',
      year: '2026',
      journal: 'Journal of Reproducible ML',
      doi: '10.1038/s41586-026-00001-1',
    });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.title).toBe('Verifier-Guided Reinforcement Learning');
    expect(parsed.DOI).toBe('10.1038/s41586-026-00001-1');
  });

  it('wires Playwright E2E/axe/reflow & backfill dry-run checks into .github/workflows/quality.yml', () => {
    const workflow = readFileSync(join(process.cwd(), '.github/workflows/quality.yml'), 'utf8');
    expect(workflow).toContain('scripts/v34-backfill-reconcile.mjs --dry-run');
    expect(workflow).toContain('scripts/verify-v34-live.mjs');
    expect(workflow).toContain('test/e2e/v34-a11y-reflow.spec.ts');
  });
});
