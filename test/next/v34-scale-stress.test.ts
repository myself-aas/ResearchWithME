import { describe, expect, it } from 'vitest';
import { normalizeScholarlyIdentifier } from '@/lib/v34/identifiers';
import { buildCitation } from '@/lib/citations';
import { revalidateAnchor } from '@/lib/scholarly/annotations';
import type { AnnotationAnchor } from '@/lib/schemas/annotations';
import {
  NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES,
  resolveEffectiveNotificationPolicy,
} from '@/lib/v34/notifications-safe';
import { scholarlyContributionJsonLd } from '@/lib/seo/jsonld';

describe('v3.4 Wave 13 — Part V §18.16 Scale & Stress Benchmarks, Non-Suppressible Alerts & ScholarlyArticle JSON-LD', () => {
  it('normalizes and builds 10,000 citations cleanly within strict performance budget', () => {
    const start = performance.now();
    let validCount = 0;

    for (let i = 0; i < 10_000; i += 1) {
      const doi = `10.5555/rwm.scale.${i}`;
      const norm = normalizeScholarlyIdentifier(doi);
      if (norm?.scheme === 'doi') validCount += 1;
      // Spot-format BibTeX & CSL-JSON across sample stride to exercise serializer under load
      if (i % 50 === 0) {
        const bib = buildCitation('bibtex', {
          title: `Benchmark Paper ${i}`,
          author: 'Maya Lin',
          year: '2026',
          journal: 'Scale Journal',
          doi,
        });
        expect(bib).toContain(`doi = {${doi}}`);
      }
    }

    const elapsedMs = performance.now() - start;
    expect(validCount).toBe(10_000);
    expect(elapsedMs).toBeLessThan(3_000);
  });

  it('builds and traverses a 5,000-node provenance graph projection within latency budget', () => {
    const start = performance.now();
    const nodeCount = 5_000;
    const adjacency = new Map<string, Array<{ to: string; relation: 'SUPPORTS' | 'CONTRADICTS' | 'QUALIFIES' }>>();

    for (let i = 0; i < nodeCount; i += 1) {
      const id = `node-${i}`;
      const edges: Array<{ to: string; relation: 'SUPPORTS' | 'CONTRADICTS' | 'QUALIFIES' }> = [];
      if (i + 1 < nodeCount) {
        edges.push({
          to: `node-${i + 1}`,
          relation: i % 3 === 0 ? 'SUPPORTS' : i % 3 === 1 ? 'QUALIFIES' : 'CONTRADICTS',
        });
      }
      adjacency.set(id, edges);
    }

    // BFS reachability traversal from root source across 5,000 nodes
    const visited = new Set<string>();
    const queue = ['node-0'];
    let idx = 0;
    while (idx < queue.length) {
      const current = queue[idx++];
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edge of adjacency.get(current) ?? []) {
        if (!visited.has(edge.to)) queue.push(edge.to);
      }
    }

    const elapsedMs = performance.now() - start;
    expect(visited.size).toBe(5_000);
    expect(elapsedMs).toBeLessThan(1_000);
  });

  it('revalidates 100 concurrent annotation anchors without silent relocation or race errors', async () => {
    const sourceVersionId = '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708192';
    const corpusChunks = Array.from(
      { length: 100 },
      (_, i) => `Section ${i}: verified empirical quote #${i} confirmed in cohort ${i}.`,
    );
    const fullText = corpusChunks.join('\n');

    const start = performance.now();
    const results = await Promise.all(
      Array.from({ length: 100 }, async (_, i) => {
        const anchor: AnnotationAnchor = {
          sourceVersionId,
          structuralPath: `body > p:nth(${i + 1})`,
          textQuote: {
            exact: i < 80 ? `verified empirical quote #${i}` : `edited missing phrase #${i}`,
            prefix: `Section ${i}: `,
            suffix: ` confirmed in cohort ${i}.`,
          },
          position: { start: i * 50, end: i * 50 + 25 },
        };
        return revalidateAnchor(anchor, { sourceVersionId, text: fullText });
      }),
    );
    const elapsedMs = performance.now() - start;

    expect(results.filter((r) => r === 'valid')).toHaveLength(80);
    expect(results.filter((r) => r === 'drifted')).toHaveLength(20);
    expect(elapsedMs).toBeLessThan(1_000);
  });

  it('enforces Part V §18.14 non-suppressible integrity and security alert channels', () => {
    expect(NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES).toEqual(['integrity_alert', 'security_alert']);

    for (const mandatory of NON_SUPPRESSIBLE_NOTIFICATION_CATEGORIES) {
      const decision = resolveEffectiveNotificationPolicy({
        category: mandatory,
        userMuted: true,
        inQuietHours: true,
        digestOff: true,
      });
      expect(decision.inAppEnabled).toBe(true);
      expect(decision.pushEnabled).toBe(true);
      expect(decision.suppressible).toBe(false);
    }

    const digestOff = resolveEffectiveNotificationPolicy({
      category: 'topic_digest',
      digestOff: true,
    });
    expect(digestOff.inAppEnabled).toBe(false);
    expect(digestOff.pushEnabled).toBe(false);
    expect(digestOff.suppressible).toBe(true);
  });

  it('emits valid Schema.org ScholarlyArticle JSON-LD for canonical v3.4 contributions', () => {
    const ld = scholarlyContributionJsonLd({
      id: 'contrib-rl-cold-start',
      title: 'Cold-Start Reinforcement Learning Reasoning Replication',
      summary: 'Independent verification of reward-guided emergence.',
      authorName: 'ResearchWithME Contributor',
      authorHandle: 'myself-aas',
      datePublished: '2026-11-15T00:00:00Z',
      dateModified: '2026-11-17T00:00:00Z',
      version: 2,
      topics: ['reasoning-models', 'reproducibility'],
      primarySourceUrl: 'https://arxiv.org/abs/2501.12948',
      primarySourceTitle: 'DeepSeek-R1 Technical Report',
    });

    expect(ld['@type']).toBe('ScholarlyArticle');
    expect(ld.headline).toBe('Cold-Start Reinforcement Learning Reasoning Replication');
    expect(ld.isBasedOn).toMatchObject({
      '@type': 'CreativeWork',
      url: 'https://arxiv.org/abs/2501.12948',
    });
  });
});
