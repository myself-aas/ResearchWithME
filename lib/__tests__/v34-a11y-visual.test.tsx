// @vitest-environment jsdom
/**
 * Wave 4 Accessibility (axe-core WCAG 2.1 A/AA) & Visual/Interaction Audit
 * across ALL ResearchWithME v3.4 Wave 1–3 UI components.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import axe from 'axe-core';
import ResearchFeedClient from '@/components/v34/ResearchFeedClient';
import LibraryClient from '@/components/v34/LibraryClient';
import SaveToLibraryButton from '@/components/v34/SaveToLibraryButton';
import { ProvenanceGraphExplorer } from '@/components/v34/ProvenanceGraphExplorer';
import { PeerReviewSection } from '@/components/v34/PeerReviewSection';
import { WorkspacesClient } from '@/components/v34/WorkspacesClient';
import { ProjectWorkspaceClient } from '@/components/v34/ProjectWorkspaceClient';
import { DiscussionSection } from '@/components/v34/DiscussionSection';
import { ToolsDirectoryClient } from '@/components/v34/ToolsDirectoryClient';
import { ResearchOsClient } from '@/components/v34/ResearchOsClient';
import BottomSheet from '@/components/layout/BottomSheet';
import ResponsivePaneLayout from '@/components/layout/ResponsivePaneLayout';
import { getUnifiedResearchFeed } from '@/lib/v34/feed';
import { toProvenanceGraphData } from '@/lib/v34/scholarly-adapter';
import {
  getClaimEvidenceLinks,
  listClaims,
  listContributions,
  listEvidence,
  listLibraryItems,
  listResearchGoals,
  listSources,
  resetV34StoreForTesting,
} from '@/lib/v34/store';
import {
  getProjectByIdOrSlug,
  listFormalReviews,
  listProjects,
  listWorkspaceMembers,
  listWorkspaces,
  resetWave2StoreForTesting,
} from '@/lib/v34/wave2-store';
import {
  getDashboardPreferences,
  getRecognitionSummary,
  listAssistantTasks,
  listAttentionItems,
  listDiscussions,
  listNotifications,
  listProjectNotes,
  listToolRepositories,
  resetWave3StoreForTesting,
} from '@/lib/v34/wave3-store';

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

async function runAxeOnMarkup(element: React.ReactElement): Promise<axe.AxeResults> {
  const html = renderToStaticMarkup(element);
  document.body.innerHTML = `<main id="main-content"><h1>Audit Heading</h1>${html}</main>`;
  return axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
}

describe('v3.4 Wave 4 axe-core WCAG 2.1 A/AA & visual token audit', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('Wave 1 surfaces (ResearchFeedClient, LibraryClient, SaveToLibraryButton, ResponsivePaneLayout) pass axe WCAG 2.1 AA', async () => {
    const contributions = listContributions();
    const sources = await listSources();
    const feed = await getUnifiedResearchFeed();

    const rFeed = await runAxeOnMarkup(
      createElement(ResearchFeedClient, {
        initialItems: feed.items,
        availableTopics: feed.availableTopics,
        sourceCount: sources.length,
      }),
    );
    expect(rFeed.violations).toEqual([]);

    const rLib = await runAxeOnMarkup(
      createElement(LibraryClient, {
        initialItems: listLibraryItems('default'),
        initialGoals: listResearchGoals('default'),
      }),
    );
    expect(rLib.violations).toEqual([]);

    const rSave = await runAxeOnMarkup(
      createElement(SaveToLibraryButton, {
        itemType: 'contribution',
        itemId: contributions[0].id,
        title: contributions[0].title,
        url: `/contribution/${contributions[0].id}`,
      }),
    );
    expect(rSave.violations).toEqual([]);

    const rPane = await runAxeOnMarkup(
      createElement(ResponsivePaneLayout, {
        leftRail: createElement('div', null, 'Filter sidebar'),
        main: createElement('div', null, 'Primary pane'),
        rightRail: createElement('div', null, 'Inspector pane'),
      }),
    );
    expect(rPane.violations).toEqual([]);
  });

  it('Wave 2 surfaces (ProvenanceGraphExplorer, PeerReviewSection, WorkspacesClient, ProjectWorkspaceClient) pass axe WCAG 2.1 AA', async () => {
    const [sources, workspaces, projects] = await Promise.all([
      listSources(),
      listWorkspaces(),
      listProjects(),
    ]);
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

    const rGraph = await runAxeOnMarkup(
      createElement(ProvenanceGraphExplorer, {
        initialObjects: graph.objects,
        initialRelationships: graph.relationships,
        initialClaimEvidence: claimEvidence,
      }),
    );
    expect(rGraph.violations).toEqual([]);

    const rReview = await runAxeOnMarkup(
      createElement(PeerReviewSection, {
        contributionId: 'contrib-rl-cold-start',
        contributionVersion: 1,
        initialReviews: listFormalReviews('contrib-rl-cold-start'),
      }),
    );
    expect(rReview.violations).toEqual([]);

    const rWs = await runAxeOnMarkup(
      createElement(WorkspacesClient, {
        initialWorkspaces: workspaces,
        initialProjects: projects,
      }),
    );
    expect(rWs.violations).toEqual([]);

    const project = await getProjectByIdOrSlug('reasoning-cold-start-replication');
    expect(project).not.toBeNull();
    const notes = await listProjectNotes(project!.id);
    const rProj = await runAxeOnMarkup(
      createElement(ProjectWorkspaceClient, {
        initialProject: project!,
        initialNotes: notes,
        workspaceMembers: listWorkspaceMembers(project!.workspaceId),
        availableSources: sources,
        availableContributions: contributions,
        graphObjects: graph.objects,
        graphRelationships: graph.relationships,
        claimEvidence,
      }),
    );
    expect(rProj.violations).toEqual([]);
  });

  it('Wave 3 surfaces (DiscussionSection, ToolsDirectoryClient, ResearchOsClient) pass axe WCAG 2.1 AA', async () => {
    const [sources, tools, projects] = await Promise.all([
      listSources(),
      listToolRepositories(),
      listProjects(),
    ]);

    const rDisc = await runAxeOnMarkup(
      createElement(DiscussionSection, {
        objectType: 'contribution',
        objectId: 'contrib-rl-cold-start',
        initialDiscussions: listDiscussions({
          objectType: 'contribution',
          objectId: 'contrib-rl-cold-start',
        }),
      }),
    );
    expect(rDisc.violations).toEqual([]);

    const rTools = await runAxeOnMarkup(
      createElement(ToolsDirectoryClient, {
        initialTools: tools,
        availableSources: sources,
      }),
    );
    expect(rTools.violations).toEqual([]);

    const rOs = await runAxeOnMarkup(
      createElement(ResearchOsClient, {
        initialAttention: listAttentionItems('default'),
        initialNotifications: listNotifications('default'),
        initialAssistantTasks: listAssistantTasks('default'),
        initialGoals: listResearchGoals('default'),
        initialProjects: projects,
        initialRecognition: getRecognitionSummary('myself-aas').summary,
        initialPreferences: getDashboardPreferences('default'),
      }),
    );
    expect(rOs.violations).toEqual([]);
  });

  it('§D.4 BottomSheet traps keyboard focus, closes on Escape, and restores focus to opener', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root: Root = createRoot(container);

    let open = false;
    const renderApp = () => {
      act(() => {
        root.render(
          <div>
            <button
              id="sheet-trigger"
              type="button"
              onClick={() => {
                open = true;
                renderApp();
              }}
            >
              Open filters
            </button>
            <BottomSheet
              open={open}
              onClose={() => {
                open = false;
                renderApp();
              }}
              title="Filter Controls"
            >
              <button id="inside-action" type="button">
                Apply filter
              </button>
            </BottomSheet>
          </div>,
        );
      });
    };

    renderApp();
    const trigger = container.querySelector<HTMLButtonElement>('#sheet-trigger')!;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open sheet: focus moves inside dialog (close button)
    act(() => {
      trigger.click();
    });
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.contains(document.activeElement)).toBe(true);

    // Tab wraps back around from last focusable element inside the sheet
    const insideBtn = container.querySelector<HTMLButtonElement>('#inside-action')!;
    insideBtn.focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(dialog!.contains(document.activeElement)).toBe(true);

    // Escape closes dialog and restores focus back to the opener trigger
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    act(() => root.unmount());
    container.remove();
  });
});
