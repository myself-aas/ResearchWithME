import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  V34_ANALYTICS_EVENTS,
  listRecentAnalyticsEvents,
  recordAnalyticsEvent,
  sanitizeAnalyticsEvent,
} from '@/lib/v34/analytics';
import { V34_EXPERIMENTS, assignExperimentVariant } from '@/lib/v34/experiments';
import { CreateEvidenceInputSchema } from '@/lib/v34/contracts';
import { GET as getSearch } from '@/app/api/search/route';
import { executeUnifiedSearch } from '@/lib/v34/search';

describe('v3.4 Wave 15 — Normative Analytics, Multi-Facet Search, A11y & Offline Completeness', () => {
  it('enforces all 14 Part I §17 analytics event names and scrubs PII, sensitive text, and restricted properties', () => {
    expect(V34_ANALYTICS_EVENTS).toHaveLength(14);
    expect(V34_ANALYTICS_EVENTS).toContain('feed_viewed');
    expect(V34_ANALYTICS_EVENTS).toContain('contribution_published');
    expect(V34_ANALYTICS_EVENTS).toContain('second_contribution_started');

    const scrubbed = sanitizeAnalyticsEvent({
      event: 'evidence_added',
      subjectBucket: 'bucket-researcher-9',
      classification: 'PUBLIC',
      properties: {
        surface: 'editor',
        locatorKind: 'commit',
        rawQuote: 'Confidential patient quote should never leak',
        email: 'researcher@example.edu',
        reviewerName: 'Dr. Secret Reviewer',
        token: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload',
      },
    });
    expect(scrubbed.properties).toEqual({ surface: 'editor', locatorKind: 'commit' });
    expect(scrubbed.redactedFields).toEqual(
      expect.arrayContaining(['rawQuote', 'email', 'reviewerName', 'token']),
    );

    // CONFIDENTIAL/RESTRICTED workspaces drop all custom properties
    const restricted = recordAnalyticsEvent({
      event: 'draft_generated',
      subjectBucket: 'bucket-restricted-1',
      classification: 'RESTRICTED',
      properties: {
        surface: 'editor',
        contributionType: 'paper-review',
      },
    });
    expect(restricted.properties).toEqual({});
    expect(restricted.redactedFields).toEqual(['surface', 'contributionType']);
    expect(listRecentAnalyticsEvents(5)[0]?.event).toBe('draft_generated');
  });

  it('registers all 5 Part I §17 priority experiment families with guardrails and owners', () => {
    const ids = V34_EXPERIMENTS.map((e) => e.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'exp-feed-contribution-cta-v1',
        'exp-feed-architecture-v1',
        'exp-assistant-placement-v1',
        'exp-article-engagement-v1',
        'exp-signup-trigger-v1',
      ]),
    );
    for (const exp of V34_EXPERIMENTS) {
      expect(exp.guardrails.length).toBeGreaterThanOrEqual(2);
      expect(exp.minimumRuntimeDays).toBeGreaterThanOrEqual(14);
      expect(exp.owner.length).toBeGreaterThan(2);
      const assigned = assignExperimentVariant(exp.id, 'anon-42');
      expect(assigned).not.toBeNull();
      expect(exp.variants).toContain(assigned!.variant);
    }
  });

  it('supports Part V §18.11 integrity, access, language facets & fail-closed classification filtering on /api/search', async () => {
    const openRes = await getSearch(
      new Request('http://localhost/api/search?q=&type=source&access=open&language=en&integrity=active'),
    );
    expect(openRes.status).toBe(200);
    const openData = (await openRes.json()) as {
      hits: Array<{ accessState?: string; language?: string; integrityStatus?: string }>;
      appliedFilters?: { integrity?: string; access?: string; language?: string };
    };
    expect(openData.appliedFilters).toEqual({
      integrity: 'active',
      access: 'open',
      language: 'en',
    });
    for (const hit of openData.hits) {
      expect(hit.accessState).toBe('open');
      expect(hit.language).toBe('en');
      expect(hit.integrityStatus).toBe('active');
    }

    // Non-matching language returns empty list cleanly
    const bnSearch = await executeUnifiedSearch({
      query: 'PagedAttention',
      language: 'bn',
      authorizedClassifications: ['PUBLIC'],
    });
    expect(bnSearch.hits).toHaveLength(0);

    // Canonical URLs route directly to first-class claim/topic detail pages
    const claimSearch = await executeUnifiedSearch({ query: '', types: ['claim'] });
    if (claimSearch.hits.length > 0) {
      expect(claimSearch.hits[0].url).toMatch(/^\/claim\//);
    }
    const topicSearch = await executeUnifiedSearch({ query: '', types: ['topic'] });
    if (topicSearch.hits.length > 0) {
      expect(topicSearch.hits[0].url).toMatch(/^\/topics\//);
    }
  });

  it('validates all 8 Part II evidence locator kinds in CreateEvidenceInputSchema', () => {
    const part2Kinds = [
      'page',
      'section',
      'figure',
      'table',
      'url',
      'repository',
      'commit',
      'line',
    ] as const;

    for (const kind of part2Kinds) {
      const parsed = CreateEvidenceInputSchema.safeParse({
        sourceId: 'src-arxiv-2501-12948',
        sourceVersionId: 'sv-1',
        statement: 'Structured empirical evidence linked to a canonical source locator.',
        locator: { kind, value: 'ref-1' },
        extractionType: 'quantitative',
      });
      expect(parsed.success, `Expected locator kind "${kind}" to validate`).toBe(true);
    }
  });

  it('wires Part I §13 & Part II accessibility/offline controls into BlogHeader, ResearchOsClient, and ScholarlyEditorWorkspace', () => {
    const root = process.cwd();
    const header = readFileSync(join(root, 'components/BlogHeader.tsx'), 'utf8');
    expect(header).toContain("setAttribute('inert', '')");
    expect(header).toContain('Navigation menu opened');
    expect(header).toContain('Navigation menu closed');

    const ros = readFileSync(join(root, 'components/v34/ResearchOsClient.tsx'), 'utf8');
    expect(ros).toContain('Move ${mod.label} up');
    expect(ros).toContain('Move ${mod.label} down');
    expect(ros).toContain('rwm_os_module_order');
    expect(ros).toContain('Offline mode');

    const editor = readFileSync(join(root, 'components/v34/ScholarlyEditorWorkspace.tsx'), 'utf8');
    expect(editor).toContain('Pending sync:');
    expect(editor).toContain('Block moved to position');
    expect(editor).toContain('A newer draft version is available');
  });
});
