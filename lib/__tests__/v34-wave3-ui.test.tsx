// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiscussionSection } from '@/components/v34/DiscussionSection';
import { ToolsDirectoryClient } from '@/components/v34/ToolsDirectoryClient';
import { ResearchOsClient } from '@/components/v34/ResearchOsClient';
import {
  listResearchGoals,
  listSources,
  resetV34StoreForTesting,
} from '@/lib/v34/store';
import { listProjects, resetWave2StoreForTesting } from '@/lib/v34/wave2-store';
import {
  getDashboardPreferences,
  getRecognitionSummary,
  listAssistantTasks,
  listAttentionItems,
  listDiscussions,
  listNotifications,
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

describe('v3.4 Wave 3 UI components', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    resetV34StoreForTesting();
    resetWave2StoreForTesting();
    resetWave3StoreForTesting();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders DiscussionSection clearly separated from Formal Peer Review with locked thread protection', () => {
    const seeded = listDiscussions({
      objectType: 'contribution',
      objectId: 'contrib-rl-cold-start',
    });
    const lockedSample = [
      ...seeded,
      {
        ...seeded[0],
        id: 'disc-locked-test',
        title: 'Locked Replication Side-Thread',
        locked: true,
        lockedReason: 'Formal critiques moved to Peer Review.',
      },
    ];

    act(() => {
      root.render(
        <DiscussionSection
          objectType="contribution"
          objectId="contrib-rl-cold-start"
          initialDiscussions={lockedSample}
        />,
      );
    });

    expect(container.textContent).toContain('Informal Discussion · Separate from Formal Peer Review');
    expect(container.textContent).toContain('Community Q&A & Replication Notes');
    expect(container.textContent).toContain('Formal critiques moved to Peer Review.');
  });

  it('renders ToolsDirectoryClient with timestamped repository observations and linked citable software sources', async () => {
    const [tools, sources] = await Promise.all([listToolRepositories(), listSources()]);

    act(() => {
      root.render(<ToolsDirectoryClient initialTools={tools} availableSources={sources} />);
    });

    expect(container.textContent).toContain('vLLM');
    expect(container.textContent).toContain('Open-R1');
    expect(container.textContent).toContain('Repository metrics observed on');
    expect(container.textContent).toContain('kept separate from immutable Source records');
    expect(container.textContent).toContain('Linked Citable Sources');
  });

  it('renders ResearchOsClient with separated Attention, Notifications, Assistant Promotion, Goals, Recognition, and Preferences', async () => {
    const projects = await listProjects();
    const attention = listAttentionItems('default');
    const notifications = listNotifications('default');
    const assistantTasks = listAssistantTasks('default');
    const goals = listResearchGoals('default');
    const { summary: recognition } = getRecognitionSummary('myself-aas');
    const preferences = getDashboardPreferences('default');

    act(() => {
      root.render(
        <ResearchOsClient
          initialAttention={attention}
          initialNotifications={notifications}
          initialAssistantTasks={assistantTasks}
          initialGoals={goals}
          initialProjects={projects}
          initialRecognition={recognition}
          initialPreferences={preferences}
        />,
      );
    });

    // Strict §10 sections
    expect(container.textContent).toContain('Attention Queue');
    expect(container.textContent).toContain('Event History');
    expect(container.textContent).toContain('Optional Assistant Suggestions');
    expect(container.textContent).toContain('Promote to Attention Queue');

    // §11 Event-derived recognition without composite score
    expect(container.textContent).toContain('Event-Derived Scholarly Recognition');
    expect(container.textContent).toContain('No opaque composite reputation score');
    expect(container.textContent).not.toContain('Reputation Score:');

    // §12 Accessible goal progressbar
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();

    // §13–§14 Landing & Topic Follow preferences
    expect(container.textContent).toContain('Default landing surface');
    expect(container.textContent).toContain('Followed Topics');
  });
});
