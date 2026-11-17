import type { Metadata } from 'next';
import Link from 'next/link';
import { GitBranch } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { WorkspacesClient } from '@/components/v34/WorkspacesClient';
import { listProjects, listWorkspaces } from '@/lib/v34/wave2-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Research Workspaces & Projects',
  description:
    'Collaborative research workspaces organizing objectives, milestones, linked primary sources, claims, and peer-reviewed outputs.',
};

export default async function WorkspacesPage() {
  const [workspaces, projects] = await Promise.all([listWorkspaces(), listProjects()]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16 space-y-8"
      >
        <header className="border-b border-line pb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Workspaces &amp; Research Projects
            </h1>
            <p className="font-sans text-sm leading-relaxed text-ink-secondary sm:text-base">
              Workspaces govern collaborator roles and permissions; projects track concrete
              research objectives, milestones, and linked sources, evidence units, claims, and
              contributions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/research-os"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand"
            >
              Research OS
            </Link>
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand"
            >
              Tool Registry
            </Link>
            <Link
              href="/graph"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              Provenance Graph
            </Link>
            <Link
              href="/contribute"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 font-sans text-xs font-medium text-on-primary hover:opacity-90"
            >
              New Contribution
            </Link>
          </div>
        </header>

        <WorkspacesClient initialWorkspaces={workspaces} initialProjects={projects} />
      </main>
      <BlogFooter />
    </div>
  );
}
