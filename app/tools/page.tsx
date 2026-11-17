import type { Metadata } from 'next';
import Link from 'next/link';
import { Code2, FolderKanban, GitBranch } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { ToolsDirectoryClient } from '@/components/v34/ToolsDirectoryClient';
import { listSources } from '@/lib/v34/store';
import { listToolRepositories } from '@/lib/v34/wave3-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Open-Source Research Tools',
  description:
    'Global deduplicated registry of open-source research repositories linked to citable software Source snapshots with timestamped observations.',
};

export default async function ToolsDirectoryPage() {
  const [tools, sources] = await Promise.all([listToolRepositories(), listSources()]);

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
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              Global Open-Source Tool Registry
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Research Tool Repositories
            </h1>
            <p className="font-sans text-sm leading-relaxed text-ink-secondary sm:text-base">
              Deduplicated live repositories with timestamped observation metadata, linked to
              immutable citable software Source releases and archived snapshots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/workspaces"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand"
            >
              <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
              Workspaces
            </Link>
            <Link
              href="/graph"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 font-sans text-xs font-medium text-on-primary hover:opacity-90"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              Provenance Graph
            </Link>
          </div>
        </header>

        <ToolsDirectoryClient initialTools={tools} availableSources={sources} />
      </main>
      <BlogFooter />
    </div>
  );
}
