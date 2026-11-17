import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/v34/http', async () => {
  const actual = await vi.importActual<typeof import('@/lib/v34/http')>('@/lib/v34/http');
  return {
    ...actual,
    requireContributor: vi.fn(async () => ({
      ok: true as const,
      actor: {
        id: 'local-contributor',
        handle: 'local-researcher',
        name: 'Local Researcher',
        email: 'researcher@example.edu',
        isEditor: true,
        supabase: null,
      },
    })),
  };
});

import { validateAndSanitizeMdx, sanitizeMdxUrl } from '@/lib/v34/mdx-security';
import {
  V34_FEATURE_FLAGS,
  evaluateV34Flag,
  deterministicBucket,
} from '@/lib/v34/feature-flags';
import { V34_EXPERIMENTS, assignExperimentVariant } from '@/lib/v34/experiments';
import { resolvePostAuthDestination, isSafeInternalPath } from '@/lib/v34/landing';
import { editorDb } from '@/lib/persistence/editor-db';
import { performLogoutLocalWipe } from '@/lib/persistence/logout-wipe';
import { POST as createContributionRoute } from '@/app/api/contributions/route';
import { resetV34StoreForTesting } from '@/lib/v34/store';
import {
  classifyResearchNote,
  deduplicateTools,
  routeLegacyRelationship,
  runReconciliationDryRun,
} from '@/scripts/v34-backfill-reconcile.mjs';

describe('v3.4 Wave 9 — MDX Security, Targeting Flags, Experiments, Landing, PWA Wipe & Backfill Parity', () => {
  beforeEach(() => {
    resetV34StoreForTesting();
    editorDb.clearMemoryForTesting();
  });

  it('enforces Part V §16.2 MDX security allowlist and rejects unsafe payloads on contribution creation', async () => {
    const safeDoc = validateAndSanitizeMdx(
      '# Empirical Summary\n\n<EvidenceCallout id="ev-1" />\n\n```tsx\nimport React from "react";\n<script>alert(1)</script>\n```',
    );
    expect(safeDoc.safe).toBe(true);

    const unsafeImport = validateAndSanitizeMdx('import fs from "node:fs";\n# Hello');
    expect(unsafeImport.safe).toBe(false);
    expect(unsafeImport.violations.some((v) => v.code === 'IMPORT_EXPORT_PROHIBITED')).toBe(true);

    const unsafeScript = validateAndSanitizeMdx('<script>alert(1)</script> [click](javascript:alert(1))');
    expect(unsafeScript.safe).toBe(false);
    expect(unsafeScript.violations.some((v) => v.code === 'FORBIDDEN_TAG')).toBe(true);
    expect(unsafeScript.violations.some((v) => v.code === 'DANGEROUS_URL_SCHEME')).toBe(true);
    expect(unsafeScript.sanitizedMdx).not.toContain('<script>');
    expect(unsafeScript.sanitizedMdx).not.toContain('javascript:');

    const unsafeComponent = validateAndSanitizeMdx('<ArbitraryWidget onClick={hack} />');
    expect(unsafeComponent.safe).toBe(false);
    expect(unsafeComponent.violations.some((v) => v.code === 'UNALLOWED_COMPONENT')).toBe(true);
    expect(unsafeComponent.violations.some((v) => v.code === 'EVENT_HANDLER_PROHIBITED')).toBe(true);

    expect(sanitizeMdxUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeMdxUrl('https://doi.org/10.1000/xyz')).toBe('https://doi.org/10.1000/xyz');

    // Verify POST /api/contributions rejects malicious MDX blocks with HTTP 400
    const badReq = new NextRequest('http://localhost/api/contributions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'wave9-mdx-reject-1',
      },
      body: JSON.stringify({
        contributionType: 'research-note',
        title: 'Malicious MDX Injection Attempt',
        summary: 'Summary long enough to pass Zod minimum length validation rules.',
        topics: ['security'],
        tags: ['test'],
        document: {
          schemaVersion: '1.0',
          id: 'draft-malicious-1',
          title: 'Malicious MDX Injection Attempt',
          authorId: 'local-contributor',
          workspaceId: 'ws-default',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          blocks: [
            {
              id: 'b-xss',
              type: 'paragraph',
              text: 'Injected payload <script>alert(1)</script> [x](javascript:void(0))',
            },
          ],
        },
      }),
    });
    const res = await createContributionRoute(badReq);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.violations.length).toBeGreaterThanOrEqual(1);
  });

  it('supports Part V §14.1 targeted feature flags, §14.2 deterministic experiments, and Part VI §4.1 landing resolution', () => {
    expect(V34_FEATURE_FLAGS).toContain('contribution-feed-v1');
    expect(V34_FEATURE_FLAGS).toContain('offline-sync-v1');
    expect(V34_FEATURE_FLAGS).toContain('v34-normalized-relations');

    // Deterministic user/workspace/role targeting
    expect(
      evaluateV34Flag(
        'provenance-graph-v1',
        { userId: 'u-pilot-1', workspaceId: 'ws-alpha', role: 'RESEARCHER' },
        { enabled: true, allowedUsers: ['u-pilot-1'] },
      ),
    ).toBe(true);
    expect(
      evaluateV34Flag(
        'provenance-graph-v1',
        { userId: 'u-other', workspaceId: 'ws-beta', role: 'VIEWER' },
        { enabled: true, allowedUsers: ['u-pilot-1'] },
      ),
    ).toBe(false);
    expect(deterministicBucket('flag-a', 'user-1')).toBe(deterministicBucket('flag-a', 'user-1'));

    // Experiments registry
    expect(V34_EXPERIMENTS.length).toBeGreaterThanOrEqual(3);
    const a1 = assignExperimentVariant('exp-feed-contribution-cta-v1', 'user-42');
    const a2 = assignExperimentVariant('exp-feed-contribution-cta-v1', 'user-42');
    expect(a1).toEqual(a2);
    expect(a1?.variant).toBeTruthy();

    // Canonical post-auth landing resolution
    expect(isSafeInternalPath('/contribution/contrib-rl-cold-start')).toBe(true);
    expect(isSafeInternalPath('//evil.example.com/phish')).toBe(false);
    expect(
      resolvePostAuthDestination({
        returnTo: '/project/reasoning-cold-start-replication',
        configuredLanding: 'feed',
      }),
    ).toBe('/project/reasoning-cold-start-replication');
    expect(resolvePostAuthDestination({ returnTo: '//evil.example.com', configuredLanding: 'library' })).toBe(
      '/library',
    );
    expect(resolvePostAuthDestination({ configuredLanding: 'projects' })).toBe('/projects');
    expect(resolvePostAuthDestination({})).toBe('/research-os');
  });

  it('enforces Part V §15.1–§15.3 PWA classification-safe caching and logout IndexedDB wipe', async () => {
    await editorDb.putDraft({
      id: 'draft-restricted-wipe',
      workspaceId: 'ws-restricted',
      contributionType: 'research-note',
      title: 'Confidential Working Draft',
      document: {
        schemaVersion: '1.0',
        id: 'draft-restricted-wipe',
        title: 'Confidential Working Draft',
        authorId: 'local-contributor',
        workspaceId: 'ws-restricted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [{ id: 'b1', type: 'paragraph', text: 'Restricted text.' }],
      },
      localVersion: 1,
      remoteVersion: 0,
      saveState: 'offline',
      lastModifiedAt: new Date().toISOString(),
    });
    expect(await editorDb.getDraft('draft-restricted-wipe')).not.toBeNull();

    const wipe = await performLogoutLocalWipe({ clearLocalDrafts: true });
    expect(wipe.draftsCleared).toBe(true);
    expect(await editorDb.getDraft('draft-restricted-wipe')).toBeUndefined();

    // Verify public/sw.js never caches authenticated APIs or private dashboards
    const swCode = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    expect(swCode).toContain("'/api/'");
    expect(swCode).toContain("'/research-os'");
    expect(swCode).toContain("'/dashboard'");
  });

  it('passes Part VII §6 dry-run backfill, checksum parity, tool deduplication & relationship quarantine rules', () => {
    const pubNote = classifyResearchNote({
      id: 'rn-pub',
      authorId: 'u-1',
      visibility: 'PUBLIC',
      body: 'sample',
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(pubNote.targetTable).toBe('v34_contributions');
    expect(pubNote.checksum).toHaveLength(64);

    const anchoredNote = classifyResearchNote({
      id: 'rn-ann',
      authorId: 'u-1',
      visibility: 'PRIVATE',
      sourceVersionId: 'sv-1',
      anchorLocator: 'Table 2',
      body: 'sample',
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(anchoredNote.targetTable).toBe('v34_annotations');

    const dedup = deduplicateTools([
      { id: '1', workspaceId: 'ws-1', host: 'GitHub.com', owner: 'Org', name: 'Repo.git', observedAt: '2026-01-01' },
      { id: '2', workspaceId: 'ws-2', host: 'github.com', owner: 'org', name: 'repo', observedAt: '2026-02-01' },
    ]);
    expect(dedup.globalTools).toHaveLength(1);
    expect(dedup.workspaceBridges).toHaveLength(2);

    expect(
      routeLegacyRelationship({ sourceKind: 'claim', targetKind: 'evidence', relationType: 'SUPPORTS' }).targetTable,
    ).toBe('v34_claim_evidence');
    expect(
      routeLegacyRelationship({ sourceKind: 'unknown', targetKind: 'other', relationType: 'MISC' }).quarantined,
    ).toBe(true);

    const report = runReconciliationDryRun();
    expect(report.privacySafeLog).toBe(true);
    expect(report.v34MigrationCount).toBe(8);
    expect(report.researchNotes.checksumParityPassed).toBe(true);
    expect(report.tools.deduplicatedGlobalCount).toBe(1);
    expect(report.relationships.normalizedCount).toBe(3);
    expect(report.relationships.quarantinedCount).toBe(1);
  });
});
