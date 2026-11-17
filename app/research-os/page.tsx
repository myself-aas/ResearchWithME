import type { Metadata } from 'next';
import Link from 'next/link';
import { Code2, Compass, FolderKanban, Layers } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { ResearchOsClient } from '@/components/v34/ResearchOsClient';
import { getDashboardUser } from '@/lib/cms/auth';
import { listResearchGoals } from '@/lib/v34/store';
import { listProjects } from '@/lib/v34/wave2-store';
import {
  getDashboardPreferences,
  getRecognitionSummary,
  listAssistantTasks,
  listAttentionItems,
  listNotifications,
} from '@/lib/v34/wave3-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Personal Research OS',
  description:
    'Action-required attention queue, event-history notifications, optional assistant suggestions, substantive research goals, and event-derived scholarly recognition.',
};

export default async function ResearchOsPage() {
  const user = await getDashboardUser();
  const userId = user?.id ?? 'default';
  const handle = user?.email?.split('@')[0] || 'myself-aas';

  const [projects] = await Promise.all([listProjects()]);
  const attention = listAttentionItems(userId);
  const notifications = listNotifications(userId);
  const assistantTasks = listAssistantTasks(userId);
  const goals = listResearchGoals(userId);
  const { summary: recognition } = getRecognitionSummary(handle);
  const preferences = getDashboardPreferences(userId);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16 space-y-6"
      >
        <header className="border-b border-line pb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-brand">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Personal Research OS
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Research Operations Hub
            </h1>
            <p className="font-sans text-sm leading-relaxed text-ink-secondary sm:text-base">
              Keep Attention items, Notification history, Optional Assistant Tasks, Research Goals,
              and Event-Derived Recognition cleanly separated in one calm operating surface.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/workspaces"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 font-sans text-xs font-medium text-ink hover:border-brand"
            >
              <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
              Workspaces
            </Link>
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 font-sans text-xs font-medium text-ink hover:border-brand"
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              Tools
            </Link>
            <Link
              href="/feed"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 font-sans text-xs font-medium text-on-primary hover:opacity-90"
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Feed
            </Link>
          </div>
        </header>

        <ResearchOsClient
          initialAttention={attention}
          initialNotifications={notifications}
          initialAssistantTasks={assistantTasks}
          initialGoals={goals}
          initialProjects={projects}
          initialRecognition={recognition}
          initialPreferences={preferences}
        />
      </main>
      <BlogFooter />
    </div>
  );
}
