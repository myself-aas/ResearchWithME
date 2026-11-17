import { beforeEach, describe, expect, it } from 'vitest';
import { DASHBOARD_SECTION_TARGETS, resolveDashboardSection } from '@/lib/v34/dashboard-routes';
import {
  ACADEMIC_RESOLVER_ORDER,
  assertAllowedResolverUrl,
  buildRepositoryObservation,
  planResolverEndpoints,
  resolveScholarlyMetadata,
} from '@/lib/v34/resolvers';
import { enqueueAndRunJob, REQUIRED_V34_JOB_TYPES } from '@/lib/v34/job-runner';
import {
  executeDualRead,
  getDualReadTelemetrySnapshot,
  resetDualReadTelemetryForTesting,
} from '@/lib/v34/dual-read';
import { normalizeScholarlyIdentifier } from '@/lib/v34/identifiers';

describe('v3.4 Wave 11 — Dashboard Deep Links, SSRF-Safe Resolvers, 15 Background Jobs & Dual-Read Telemetry', () => {
  beforeEach(() => {
    resetDualReadTelemetryForTesting();
  });

  it('resolves all 15 Part I §26.2 canonical /dashboard/<section> routes safely and rejects unknown sections', () => {
    const expectedSections = [
      'library',
      'projects',
      'contributions',
      'reviews',
      'sources',
      'evidence',
      'claims',
      'workspace',
      'assistant',
      'network',
      'reputation',
      'insights',
      'archive',
      'profile',
      'settings',
    ];

    expect(Object.keys(DASHBOARD_SECTION_TARGETS).sort()).toEqual([...expectedSections].sort());
    for (const section of expectedSections) {
      const dest = resolveDashboardSection(section);
      expect(dest).toBeTruthy();
      expect(dest?.startsWith('/')).toBe(true);
      expect(dest?.startsWith('//')).toBe(false);
    }
    expect(resolveDashboardSection('nonexistent-section')).toBeNull();
  });

  it('enforces Part V §11 SSRF host allowlist, ordered resolver waterfall, and GitHub/GitLab observation normalization', async () => {
    expect(ACADEMIC_RESOLVER_ORDER).toEqual([
      'crossref',
      'openalex',
      'pubmed',
      'arxiv',
      'datacite',
      'unpaywall',
    ]);

    // SSRF guard rejects localhost, private IPs, metadata IPs, and HTTP
    expect(() => assertAllowedResolverUrl('http://api.crossref.org/works/10.1000/1')).toThrow();
    expect(() => assertAllowedResolverUrl('https://169.254.169.254/latest/meta-data')).toThrow();
    expect(() => assertAllowedResolverUrl('https://127.0.0.1/internal')).toThrow();
    expect(() => assertAllowedResolverUrl('https://evil.example/doi')).toThrow();
    expect(assertAllowedResolverUrl('https://api.crossref.org/works/10.1038%2Fs41586-024-00001-1').hostname).toBe(
      'api.crossref.org',
    );

    const doiId = normalizeScholarlyIdentifier('10.1038/s41586-024-00001-1')!;
    const endpoints = planResolverEndpoints(doiId);
    expect(endpoints.map((e) => e.resolver)).toEqual(['crossref', 'openalex', 'datacite', 'unpaywall']);

    // Deterministic offline fallback works cleanly without network
    const fallback = await resolveScholarlyMetadata('arXiv:2501.12948', { allowNetwork: false });
    expect(fallback).toMatchObject({
      resolver: 'local-deterministic',
      venue: 'arXiv',
      accessState: 'open',
      liveResolved: false,
    });

    // Live Crossref response parsing with mocked fetcher
    const live = await resolveScholarlyMetadata('10.1038/s41586-024-00001-1', {
      allowNetwork: true,
      fetcher: async () =>
        new Response(
          JSON.stringify({
            message: {
              title: ['Verified Reasoning Benchmark'],
              author: [{ given: 'Ada', family: 'Lovelace' }],
              'container-title': ['Nature'],
              issued: { 'date-parts': [[2026, 5, 1]] },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });
    expect(live).toMatchObject({
      resolver: 'crossref',
      title: 'Verified Reasoning Benchmark',
      authors: ['Ada Lovelace'],
      venue: 'Nature',
      publishedDate: '2026-01-01',
      liveResolved: true,
    });

    const ghObs = buildRepositoryObservation('https://github.com/vllm-project/vllm', {
      starsCount: 42_000,
      licenseSpdx: 'Apache-2.0',
    });
    expect(ghObs).toMatchObject({
      host: 'github',
      owner: 'vllm-project',
      name: 'vllm',
      licenseSpdx: 'Apache-2.0',
      liveObserved: true,
    });
  });

  it('executes all 15 required Part V §9 background jobs deterministically with sanitized audit output', async () => {
    expect(REQUIRED_V34_JOB_TYPES).toHaveLength(15);

    for (const jobType of REQUIRED_V34_JOB_TYPES) {
      const { job, execution } = await enqueueAndRunJob({
        ownerId: 'user-ops-1',
        jobType,
        payload: {
          identifier: 'arXiv:2501.12948',
          sourceId: 'src-arxiv-2501-12948',
          contributionId: 'contrib-rl-cold-start',
          objectId: 'ev-grpo-emergence',
          reviewerName: 'should-be-scrubbed',
        },
      });
      expect(job.status).toBe('COMPLETED');
      expect(execution.status).toBe('COMPLETED');
      expect(execution.jobType).toBe(jobType);
      expect(JSON.stringify(job.payload)).not.toContain('should-be-scrubbed');
    }
  });

  it('tracks Part VII §4 dual-read fallback telemetry and enforces the 14-day zero-fallback contract gate', async () => {
    // 1. Normalized hit increments normalizedHits with zero fallbacks
    const normRes = await executeDualRead({
      relationName: 'ClaimEvidence',
      readNormalized: async () => [{ id: 'ce-1' }],
      readLegacy: async () => [{ id: 'legacy-1' }],
      compareParity: true,
    });
    expect(normRes.source).toBe('normalized');
    expect(normRes.parityMatch).toBe(true);

    // 15 days after cutover with zero fallbacks -> ready for legacy contract
    const cutoverStart = '2026-10-01T00:00:00.000Z';
    const fifteenDaysLater = Date.parse('2026-10-16T00:00:00.000Z');
    const readySnap = getDualReadTelemetrySnapshot({
      cutoverStartedAtIso: cutoverStart,
      nowMs: fifteenDaysLater,
    });
    expect(readySnap.legacyFallbacks).toBe(0);
    expect(readySnap.readyForLegacyContract).toBe(true);

    // 2. Legacy fallback resets readiness window immediately
    const fbRes = await executeDualRead({
      relationName: 'ContributionClaim',
      readNormalized: async () => [],
      readLegacy: async () => [{ id: 'legacy-only' }],
    });
    expect(fbRes.source).toBe('legacy-fallback');

    const blockedSnap = getDualReadTelemetrySnapshot();
    expect(blockedSnap.legacyFallbacks).toBe(1);
    expect(blockedSnap.readyForLegacyContract).toBe(false);
  });
});
