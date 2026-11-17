import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseConfiguredLanding,
  resolveHomeLandingRedirect,
  resolvePostAuthDestination,
} from '@/lib/v34/landing';
import { GET as getRecognitionRoute } from '@/app/api/recognition/route';

vi.mock('@/lib/cms/auth', () => ({
  getDashboardUser: vi.fn().mockResolvedValue(null),
}));

const root = process.cwd();

describe('Wave 16 — $Impeccable UI Polish, Landing Resolution & Shell Hardening', () => {
  it('resolves home landing redirect per Part VI §4.1 while preserving public/filtered home', () => {
    expect(parseConfiguredLanding('research-os')).toBe('research-os');
    expect(parseConfiguredLanding('last_workspace')).toBe('last_workspace');
    expect(parseConfiguredLanding('invalid-route')).toBeNull();

    // Anonymous visitors always stay on `/`
    expect(
      resolveHomeLandingRedirect({
        isAuthenticated: false,
        configuredLanding: 'research-os',
      }),
    ).toBeNull();

    // Explicit `/?view=public` always stays on `/` even when authenticated
    expect(
      resolveHomeLandingRedirect({
        isAuthenticated: true,
        viewParam: 'public',
        configuredLanding: 'research-os',
      }),
    ).toBeNull();

    // Category/search filter queries always stay on `/`
    expect(
      resolveHomeLandingRedirect({
        isAuthenticated: true,
        hasFilterParams: true,
        configuredLanding: 'feed',
      }),
    ).toBeNull();

    // Signed-in users with configured landing preferences redirect cleanly
    expect(
      resolveHomeLandingRedirect({
        isAuthenticated: true,
        configuredLanding: 'research-os',
      }),
    ).toBe('/research-os');
    expect(
      resolveHomeLandingRedirect({
        isAuthenticated: true,
        configuredLanding: 'feed',
      }),
    ).toBe('/feed');
    expect(
      resolveHomeLandingRedirect({
        isAuthenticated: true,
        configuredLanding: 'library',
      }),
    ).toBe('/library');
    expect(
      resolveHomeLandingRedirect({
        isAuthenticated: true,
        configuredLanding: 'last_workspace',
        lastWorkspaceSlug: 'ai-eval-lab',
      }),
    ).toBe('/workspaces/ai-eval-lab');
    expect(
      resolveHomeLandingRedirect({
        isAuthenticated: true,
        configuredLanding: 'home',
      }),
    ).toBeNull();

    // Deep-link preservation through post-auth destination
    expect(
      resolvePostAuthDestination({
        returnTo: '/contribution/contrib-rl-cold-start',
        configuredLanding: 'feed',
      }),
    ).toBe('/contribution/contrib-rl-cold-start');
  });

  it('GET /api/recognition refuses hardcoded owner fallback when unauthenticated and no ?handle= is provided', async () => {
    const missingHandleRes = await getRecognitionRoute(
      new Request('http://localhost/api/recognition'),
    );
    expect(missingHandleRes.status).toBe(400);

    const explicitHandleRes = await getRecognitionRoute(
      new Request('http://localhost/api/recognition?handle=dr-lin'),
    );
    expect(explicitHandleRes.status).toBe(200);
    const body = (await explicitHandleRes.json()) as {
      summary: { recipientHandle: string };
    };
    expect(body.summary.recipientHandle).toBe('dr-lin');
  });

  it('removes internal ADR-032 jargon and hardcoded myself-aas fallbacks from user-facing surfaces', () => {
    const checkedFiles = [
      'app/sources/page.tsx',
      'app/evidence/page.tsx',
      'app/claims/page.tsx',
      'app/projects/page.tsx',
      'app/reviews/page.tsx',
      'app/tool/[slug]/page.tsx',
      'app/research-os/page.tsx',
      'components/AssistantPanel.tsx',
      'components/BlogHeader.tsx',
      'components/layout/MobileBottomNav.tsx',
      'components/v34/SettingsIdentityClient.tsx',
    ];
    for (const rel of checkedFiles) {
      const src = readFileSync(join(root, rel), 'utf8');
      expect(src, `${rel} must not hardcode myself-aas`).not.toContain('myself-aas');
      expect(src, `${rel} must not leak ADR-032 jargon in UI`).not.toMatch(/ADR-032-\d+/);
    }
  });

  it('wires compact Reading and Editor BlogHeader variants onto deep reading and authoring routes', () => {
    const header = readFileSync(join(root, 'components/BlogHeader.tsx'), 'utf8');
    expect(header).toContain("variant?: 'default' | 'reading' | 'editor'");

    const contribPage = readFileSync(join(root, 'app/contribution/[id]/page.tsx'), 'utf8');
    expect(contribPage).toContain('variant="reading"');

    const postPage = readFileSync(join(root, 'app/post/[slug]/page.tsx'), 'utf8');
    expect(postPage).toContain('variant="reading"');

    const editorPage = readFileSync(join(root, 'app/editor/page.tsx'), 'utf8');
    expect(editorPage).toContain('variant="editor"');

    const editorDraftPage = readFileSync(join(root, 'app/editor/[id]/page.tsx'), 'utf8');
    expect(editorDraftPage).toContain('variant="editor"');

    const contributePage = readFileSync(join(root, 'app/contribute/page.tsx'), 'utf8');
    expect(contributePage).toContain('variant="editor"');
  });

  it('enforces >=44px touch targets across all interactive controls in components/v34/', () => {
    const v34Targets = [
      'components/v34/ContributeWizard.tsx',
      'components/v34/ContributionIntegrityExports.tsx',
      'components/v34/DiscussionSection.tsx',
      'components/v34/LibraryClient.tsx',
      'components/v34/PeerReviewSection.tsx',
      'components/v34/ProvenanceGraphExplorer.tsx',
      'components/v34/ResearchFeedClient.tsx',
      'components/v34/ResearchOsClient.tsx',
      'components/v34/ScholarlyEditorWorkspace.tsx',
      'components/v34/SearchClient.tsx',
      'components/v34/SettingsIdentityClient.tsx',
      'components/v34/ToolsDirectoryClient.tsx',
      'components/v34/TopicsClient.tsx',
    ];
    for (const rel of v34Targets) {
      const src = readFileSync(join(root, rel), 'utf8');
      expect(src, `${rel} contains sub-44px control height classes`).not.toMatch(
        /\b(?:min-h-9|min-h-10|h-8\s+w-8|h-9\s+w-9|h-10)\b/,
      );
    }
  });
});
