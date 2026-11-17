'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, FolderKanban, Plus, Users } from 'lucide-react';
import { formatShortDate } from '@/lib/formatting/locale';
import { PROJECT_STAGES, type ProjectStage } from '@/lib/v34/wave2-contracts';
import type { ProjectSummary, WorkspaceRecord } from '@/lib/v34/wave2-store';

interface WorkspacesClientProps {
  initialWorkspaces: WorkspaceRecord[];
  initialProjects: ProjectSummary[];
}

function formatStageLabel(stage: ProjectStage): string {
  return stage.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function WorkspacesClient({
  initialWorkspaces,
  initialProjects,
}: WorkspacesClientProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>(initialWorkspaces);
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [stageFilter, setStageFilter] = useState<ProjectStage | 'all'>('all');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('all');

  const [showCreateForm, setShowCreateForm] = useState<'none' | 'workspace' | 'project'>('none');
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');

  const [projWorkspaceId, setProjWorkspaceId] = useState(initialWorkspaces[0]?.id ?? '');
  const [projTitle, setProjTitle] = useState('');
  const [projObjective, setProjObjective] = useState('');
  const [projStage, setProjStage] = useState<ProjectStage>('SCOPING');
  const [projTopics, setProjTopics] = useState('Machine Learning, Reproducibility');

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      if (stageFilter !== 'all' && proj.stage !== stageFilter) return false;
      if (workspaceFilter !== 'all' && proj.workspaceId !== workspaceFilter) return false;
      return true;
    });
  }, [projects, stageFilter, workspaceFilter]);

  async function handleCreateWorkspace(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wsName, description: wsDesc, visibility: 'public' }),
      });
      const data = (await res.json()) as { workspace?: WorkspaceRecord; error?: string };
      if (!res.ok || !data.workspace) {
        setStatusMessage(data.error || 'Could not create workspace.');
        return;
      }
      setWorkspaces((prev) => [data.workspace!, ...prev]);
      setProjWorkspaceId(data.workspace.id);
      setWsName('');
      setWsDesc('');
      setShowCreateForm('none');
      setStatusMessage(`Workspace "${data.workspace.name}" created.`);
    } catch {
      setStatusMessage('Network error creating workspace.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateProject(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const topics = projTopics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: projWorkspaceId || workspaces[0]?.id,
          title: projTitle,
          objective: projObjective,
          stage: projStage,
          visibility: 'public',
          topics,
        }),
      });
      const data = (await res.json()) as { project?: ProjectSummary; error?: string };
      if (!res.ok || !data.project) {
        setStatusMessage(data.error || 'Could not create project.');
        return;
      }
      setProjects((prev) => [data.project!, ...prev]);
      setProjTitle('');
      setProjObjective('');
      setShowCreateForm('none');
      setStatusMessage(`Project "${data.project.title}" created.`);
    } catch {
      setStatusMessage('Network error creating project.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by workspace">
          <button
            type="button"
            onClick={() => setWorkspaceFilter('all')}
            aria-pressed={workspaceFilter === 'all'}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              workspaceFilter === 'all'
                ? 'border-brand bg-brand text-on-primary'
                : 'border-line bg-surface text-ink-secondary hover:text-ink'
            }`}
          >
            All workspaces ({workspaces.length})
          </button>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => setWorkspaceFilter(ws.id)}
              aria-pressed={workspaceFilter === ws.id}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                workspaceFilter === ws.id
                  ? 'border-brand bg-brand text-on-primary'
                  : 'border-line bg-surface text-ink-secondary hover:text-ink'
              }`}
            >
              {ws.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setShowCreateForm((prev) => (prev === 'workspace' ? 'none' : 'workspace'))
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink hover:border-brand"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New workspace
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => (prev === 'project' ? 'none' : 'project'))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-on-primary hover:opacity-90"
          >
            <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
            New project
          </button>
        </div>
      </div>

      {/* Create Workspace Form */}
      {showCreateForm === 'workspace' && (
        <form
          onSubmit={handleCreateWorkspace}
          className="rounded-xl border border-brand/30 bg-surface p-5 space-y-4"
        >
          <div>
            <h2 className="text-base font-semibold text-ink">Create Research Workspace</h2>
            <p className="text-xs text-ink-secondary">
              A workspace owns collaborator membership, roles, and project governance boundaries.
            </p>
          </div>
          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Workspace name</span>
            <input
              type="text"
              required
              minLength={3}
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder="e.g. Biomedical Retrieval & Verification Group"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Description</span>
            <textarea
              rows={2}
              value={wsDesc}
              onChange={(e) => setWsDesc(e.target.value)}
              placeholder="Research domain, governance scope, and shared conventions..."
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create workspace'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm('none')}
              className="rounded-lg border border-line px-3 py-2 text-xs text-ink-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Create Project Form */}
      {showCreateForm === 'project' && (
        <form
          onSubmit={handleCreateProject}
          className="rounded-xl border border-brand/30 bg-surface p-5 space-y-4"
        >
          <div>
            <h2 className="text-base font-semibold text-ink">Create Structured Research Project</h2>
            <p className="text-xs text-ink-secondary">
              Projects organize objectives, milestones, and linked canonical sources, evidence, claims, and contributions inside a workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Owning workspace</span>
              <select
                value={projWorkspaceId}
                onChange={(e) => setProjWorkspaceId(e.target.value)}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">Initial stage</span>
              <select
                value={projStage}
                onChange={(e) => setProjStage(e.target.value as ProjectStage)}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              >
                {PROJECT_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {formatStageLabel(stage)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Project title</span>
            <input
              type="text"
              required
              minLength={4}
              value={projTitle}
              onChange={(e) => setProjTitle(e.target.value)}
              placeholder="e.g. Verifiable Citation Recall Audit Across Open LLMs"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Objective (min 15 characters)</span>
            <textarea
              rows={2}
              required
              minLength={15}
              value={projObjective}
              onChange={(e) => setProjObjective(e.target.value)}
              placeholder="State the concrete research question, scope boundary, and intended verifiable output..."
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-medium text-ink">Topics (comma-separated)</span>
            <input
              type="text"
              value={projTopics}
              onChange={(e) => setProjTopics(e.target.value)}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-medium text-on-primary disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create project'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm('none')}
              className="rounded-lg border border-line px-3 py-2 text-xs text-ink-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {statusMessage && (
        <p role="status" className="text-xs font-medium text-brand">
          {statusMessage}
        </p>
      )}

      {/* Stage filter pills */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter projects by stage">
        <button
          type="button"
          onClick={() => setStageFilter('all')}
          aria-pressed={stageFilter === 'all'}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            stageFilter === 'all'
              ? 'border-ink bg-ink text-canvas'
              : 'border-line bg-surface text-ink-secondary hover:text-ink'
          }`}
        >
          All stages ({projects.length})
        </button>
        {PROJECT_STAGES.filter((s) => s !== 'ARCHIVED').map((stage) => (
          <button
            key={stage}
            type="button"
            onClick={() => setStageFilter(stage)}
            aria-pressed={stageFilter === stage}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              stageFilter === stage
                ? 'border-ink bg-ink text-canvas'
                : 'border-line bg-surface text-ink-secondary hover:text-ink'
            }`}
          >
            {formatStageLabel(stage)}
          </button>
        ))}
      </div>

      {/* §24 Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredProjects.map((project) => {
          const totalMilestones = project.milestones.length;
          const completedMilestones = project.milestones.filter(
            (m) => m.status === 'COMPLETED',
          ).length;
          const pct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
          const nextMilestone =
            project.milestones.find((m) => m.status === 'IN_PROGRESS') ??
            project.milestones.find((m) => m.status === 'PLANNED') ??
            null;

          const countByType = (t: string) => project.objects.filter((o) => o.objectType === t).length;

          return (
            <article
              key={project.id}
              className="rounded-xl border border-line bg-surface p-5 flex flex-col justify-between gap-4 hover:border-brand/50 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-ink-secondary">{project.workspaceName}</span>
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-semibold text-brand">
                    {formatStageLabel(project.stage)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold tracking-tight text-ink">
                    <Link href={`/workspaces/${project.slug}`} className="hover:text-brand">
                      {project.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-ink-secondary line-clamp-3">{project.objective}</p>
                </div>

                {/* Progress bar + explicit textual ratio (§24.1) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">Milestone progress</span>
                    <span className="text-ink-secondary">
                      {completedMilestones}/{totalMilestones} complete ({pct}%)
                    </span>
                  </div>
                  <div
                    className="h-2 w-full rounded-full bg-canvas border border-line overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${project.title} milestone progress`}
                  >
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {nextMilestone && (
                    <p className="text-xs text-ink-secondary">
                      Next milestone: <span className="text-ink font-medium">{nextMilestone.title}</span>
                      {nextMilestone.dueAt ? ` · due ${formatShortDate(nextMilestone.dueAt)}` : ''}
                    </p>
                  )}
                </div>

                {/* Canonical linked object counts */}
                <dl className="grid grid-cols-4 gap-2 pt-2 border-t border-line text-center">
                  {(
                    [
                      ['Sources', countByType('source')],
                      ['Evidence', countByType('evidence')],
                      ['Claims', countByType('claim')],
                      ['Outputs', countByType('contribution')],
                    ] as Array<[string, number]>
                  ).map(([label, count]) => (
                    <div key={label} className="rounded-lg bg-canvas/70 px-2 py-1.5">
                      <dt className="text-xs text-ink-secondary">{label}</dt>
                      <dd className="text-sm font-bold text-ink">{count}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
                <div className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {project.members.length} collaborator{project.members.length === 1 ? '' : 's'}
                  </span>
                </div>

                <Link
                  href={`/workspaces/${project.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  Open workspace
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-secondary">
          No research projects match the current filter. Clear filters or create a new project above.
        </div>
      )}
    </div>
  );
}
