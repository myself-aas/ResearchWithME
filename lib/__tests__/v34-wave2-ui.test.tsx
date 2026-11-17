// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProvenanceGraphExplorer } from '@/components/v34/ProvenanceGraphExplorer';
import { PeerReviewSection } from '@/components/v34/PeerReviewSection';
import { WorkspacesClient } from '@/components/v34/WorkspacesClient';
import { toProvenanceGraphData } from '@/lib/v34/scholarly-adapter';
import {
  getClaimEvidenceLinks,
  listClaims,
  listContributions,
  listEvidence,
  listSources,
  resetV34StoreForTesting,
} from '@/lib/v34/store';
import {
  listFormalReviews,
  listProjects,
  listWorkspaces,
  resetWave2StoreForTesting,
} from '@/lib/v34/wave2-store';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: false,
}));

describe('v3.4 Wave 2 UI components', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders ProvenanceGraphExplorer in accessible default list mode with AI-proposed curation queue', async () => {
    const sources = await listSources();
    const evidence = listEvidence();
    const claims = listClaims();
    const contributions = listContributions();
    const claimEvidence = getClaimEvidenceLinks();
    const graph = toProvenanceGraphData({
      sources,
      evidence,
      claims,
      claimEvidence,
      contributions,
    });

    act(() => {
      root.render(
        <ProvenanceGraphExplorer
          initialObjects={graph.objects}
          initialRelationships={graph.relationships}
          initialClaimEvidence={claimEvidence}
        />,
      );
    });

    // Accessible default list view & tabular relationships table
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
    // Seeded PROPOSED AI edge triggers human curation queue with Accept / Reject buttons
    expect(container.textContent).toContain('Pending Human Curation');
    expect(container.textContent).toContain('Accept edge');
    expect(container.textContent).toContain('Reject edge');
  });

  it('renders PeerReviewSection with ReviewThread and strict anonymous reviewer redaction', () => {
    const reviews = listFormalReviews('contrib-rl-cold-start');
    act(() => {
      root.render(
        <PeerReviewSection
          contributionId="contrib-rl-cold-start"
          contributionVersion={1}
          initialReviews={reviews}
        />,
      );
    });

    expect(container.textContent).toContain('Formal Peer Review · Version 1');
    expect(container.textContent).toContain('Anonymous reviewer');
    // Must NEVER expose the underlying reviewer handle or raw user ID
    expect(container.textContent).not.toContain('dr-lin-eval');
    expect(container.textContent).not.toContain('user-reviewer-1');
    // Author rebuttal linked to review item and suggestion Accept/Reject actions render
    expect(container.textContent).toContain('Rebuttal');
    expect(container.textContent).toContain('Responds to review item(s): ri-00000');
    expect(container.textContent).toContain('Accept');
    expect(container.textContent).toContain('Reject');
  });

  it('renders WorkspacesClient with §24 project cards, textual progress ratio, and stage filters', async () => {
    const [workspaces, projects] = await Promise.all([listWorkspaces(), listProjects()]);
    act(() => {
      root.render(
        <WorkspacesClient initialWorkspaces={workspaces} initialProjects={projects} />,
      );
    });

    expect(container.textContent).toContain('Cold-Start SFT vs. Pure RL Replication Study');
    expect(container.textContent).toContain('1/3 complete');
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(container.querySelector('a[href="/workspaces/reasoning-cold-start-replication"]')).not.toBeNull();
  });
});
