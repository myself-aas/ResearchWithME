import type { Metadata } from 'next';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import { listProjects } from '@/lib/v34/wave2-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Research Projects',
  description:
    'Bounded, workspace-governed research projects uniting canonical sources, milestones, tasks, and working notes.',
  path: '/projects',
  type: 'website',
});

export default async function ProjectsDirectoryPage() {
  const projects = await listProjects();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-12"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink sm:text-4xl">
              Research Projects
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Each project belongs to an owning Workspace that defines membership, classification,
              and retention boundaries.
            </p>
          </div>
          <Link
            href="/workspaces"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
          >
            Manage Workspaces
          </Link>
        </div>

        <section aria-label="Research projects" className="mt-8 grid gap-4 md:grid-cols-2">
          {projects.map((proj) => {
            const doneMilestones = proj.milestones.filter((m) => m.status === 'COMPLETED').length;
            return (
              <article
                key={proj.id}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
                      {proj.workspaceName}
                    </span>
                    <span className="rounded-full border border-brand/40 bg-brand/5 px-2.5 py-0.5 font-mono font-medium text-brand">
                      {proj.stage}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl font-semibold text-ink">
                    <Link href={`/project/${proj.slug}`} className="hover:text-brand hover:underline">
                      {proj.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-ink-secondary">{proj.objective}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-secondary">
                  <div className="flex flex-wrap gap-3 font-mono">
                    <span>
                      Milestones: {doneMilestones}/{proj.milestones.length}
                    </span>
                    <span>Objects: {proj.objects.length}</span>
                    <span>Collaborators: {proj.members.length}</span>
                  </div>
                  <Link
                    href={`/project/${proj.slug}`}
                    className="font-sans font-medium text-brand hover:underline"
                  >
                    Open project →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
