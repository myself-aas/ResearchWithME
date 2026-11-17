'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Circle, Clock, Link2, Plus, ShieldCheck, Users } from 'lucide-react';
import ResearchWorkspace from '@/components/workspace/ResearchWorkspace';
import { ProvenanceGraphExplorer } from '@/components/v34/ProvenanceGraphExplorer';
import { formatShortDate } from '@/lib/formatting/locale';
import type { KnowledgeRelationship } from '@/lib/schemas/scholarly';
import type { ClaimEvidenceLink, ContributionRecord, SourceRecord } from '@/lib/v34/store';
import type { ProvenanceGraphPayload } from '@/lib/v34/scholarly-adapter';
import {
  PROJECT_STAGES,
  type MilestoneStatus,
  type ProjectStage,
} from '@/lib/v34/wave2-contracts';
import type {
  ProjectMemberRecord,
  ProjectMilestoneRecord,
  ProjectObjectLink,
  ProjectSummary,
  WorkspaceMemberRecord,
} from '@/lib/v34/wave2-store';
import type { ProjectNoteRecord } from '@/lib/v34/wave3-store';

interface ProjectWorkspaceClientProps {
  initialProject: ProjectSummary;
  initialNotes: ProjectNoteRecord[];
  workspaceMembers: WorkspaceMemberRecord[];
  availableSources: SourceRecord[];
  availableContributions: ContributionRecord[];
  graphObjects: ProvenanceGraphPayload['objects'];
  graphRelationships: KnowledgeRelationship[];
  claimEvidence: ClaimEvidenceLink[];
}

function nextMilestoneStatus(current: MilestoneStatus): MilestoneStatus {
  if (current === 'PLANNED') return 'IN_PROGRESS';
  if (current === 'IN_PROGRESS') return 'COMPLETED';
  return 'PLANNED';
}

export function ProjectWorkspaceClient({
  initialProject,
  initialNotes,
  workspaceMembers,
  availableSources,
  availableContributions,
  graphObjects,
  graphRelationships,
  claimEvidence,
}: ProjectWorkspaceClientProps) {
  const [project, setProject] = useState<ProjectSummary>(initialProject);
  const [notes, setNotes] = useState<ProjectNoteRecord[]>(initialNotes);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [linkSourceId, setLinkSourceId] = useState(availableSources[0]?.id ?? '');
  const [selectedWsMemberId, setSelectedWsMemberId] = useState(
    workspaceMembers.find((wm) => !project.members.some((pm) => pm.userId === wm.userId))?.userId ??
      workspaceMembers[0]?.userId ??
      '',
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sourceById = new Map(availableSources.map((s) => [s.id, s]));
  const contribById = new Map(availableContributions.map((c) => [c.id, c]));

  async function handleStageChange(nextStage: ProjectStage) {
    setBusy(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage }),
      });
      const data = (await res.json()) as { project?: ProjectSummary; error?: string };
      if (!res.ok || !data.project) {
        setStatusMessage(data.error || 'Could not update project stage.');
        return;
      }
      setProject(data.project);
      setStatusMessage(`Project stage updated to ${nextStage.replace(/_/g, ' ')}.`);
    } catch {
      setStatusMessage('Network error updating project stage.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCycleMilestone(milestone: ProjectMilestoneRecord) {
    const nextStatus = nextMilestoneStatus(milestone.status);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: milestone.id, status: nextStatus }),
      });
      const data = (await res.json()) as { milestone?: ProjectMilestoneRecord; error?: string };
      if (!res.ok || !data.milestone) {
        setStatusMessage(data.error || 'Could not update milestone.');
        return;
      }
      setProject((prev) => ({
        ...prev,
        milestones: prev.milestones.map((m) => (m.id === milestone.id ? data.milestone! : m)),
      }));
    } catch {
      setStatusMessage('Network error updating milestone.');
    }
  }

  async function handleAddMilestone(event: React.FormEvent) {
    event.preventDefault();
    if (newMilestoneTitle.trim().length < 3) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMilestoneTitle,
          description: newMilestoneDesc,
          status: 'PLANNED',
        }),
      });
      const data = (await res.json()) as { milestone?: ProjectMilestoneRecord; error?: string };
      if (!res.ok || !data.milestone) {
        setStatusMessage(data.error || 'Could not create milestone.');
        return;
      }
      setProject((prev) => ({ ...prev, milestones: [...prev.milestones, data.milestone!] }));
      setNewMilestoneTitle('');
      setNewMilestoneDesc('');
      setStatusMessage('Milestone added.');
    } catch {
      setStatusMessage('Network error adding milestone.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkSource(event: React.FormEvent) {
    event.preventDefault();
    if (!linkSourceId) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectType: 'source', objectId: linkSourceId }),
      });
      const data = (await res.json()) as { link?: ProjectObjectLink; error?: string };
      if (!res.ok || !data.link) {
        setStatusMessage(data.error || 'Could not link source.');
        return;
      }
      setProject((prev) => {
        const exists = prev.objects.some(
          (o) => o.objectType === data.link!.objectType && o.objectId === data.link!.objectId,
        );
        return exists ? prev : { ...prev, objects: [...prev.objects, data.link!] };
      });
      setStatusMessage('Canonical source linked to project.');
    } catch {
      setStatusMessage('Network error linking source.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignMember(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedWsMemberId) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedWsMemberId, role: 'CONTRIBUTOR' }),
      });
      const data = (await res.json()) as { member?: ProjectMemberRecord; error?: string };
      if (!res.ok || !data.member) {
        setStatusMessage(data.error || 'Could not assign member.');
        return;
      }
      setProject((prev) => {
        const exists = prev.members.some((m) => m.userId === data.member!.userId);
        return exists ? prev : { ...prev, members: [...prev.members, data.member!] };
      });
      setStatusMessage(`${data.member.displayName} assigned to project.`);
    } catch {
      setStatusMessage('Network error assigning project member.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveProjectNote(event: React.FormEvent) {
    event.preventDefault();
    if (noteTitle.trim().length < 2 || noteBody.trim().length < 1) return;
    setBusy(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle,
          bodyMarkdown: noteBody,
          classification: 'workspace',
        }),
      });
      const data = (await res.json()) as { note?: ProjectNoteRecord; error?: string };
      if (!res.ok || !data.note) {
        setStatusMessage(data.error || 'Could not save working note.');
        return;
      }
      setNotes((prev) => [data.note!, ...prev]);
      setNoteTitle('');
      setNoteBody('');
      setStatusMessage('Private project working note saved (ProjectNote).');
    } catch {
      setStatusMessage('Network error saving project note.');
    } finally {
      setBusy(false);
    }
  }

  const completedCount = project.milestones.filter((m) => m.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {statusMessage && (
        <p role="status" className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-xs font-medium text-brand">
          {statusMessage}
        </p>
      )}

      {/* Existing 3-pane collapsible ResearchWorkspace shell */}
      <ResearchWorkspace
        regions={[
          {
            id: 'sources',
            label: 'Linked Sources & Objects',
            children: (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-ink-secondary">
                    Canonical sources, evidence units, claims, and contributions bound to this
                    project.
                  </p>
                  <ul className="space-y-2">
                    {project.objects.map((obj) => {
                      const src = obj.objectType === 'source' ? sourceById.get(obj.objectId) : null;
                      const contrib =
                        obj.objectType === 'contribution' ? contribById.get(obj.objectId) : null;
                      const href =
                        obj.objectType === 'source'
                          ? `/source/${obj.objectId}`
                          : contrib
                            ? `/contribution/${contrib.slug}`
                            : null;
                      const label = src?.title ?? contrib?.title ?? obj.objectId;

                      return (
                        <li
                          key={`${obj.objectType}:${obj.objectId}`}
                          className="rounded-lg border border-line bg-canvas/60 p-2.5 space-y-1 text-xs"
                        >
                          <span className="inline-block rounded bg-surface border border-line px-2 py-0.5 font-semibold uppercase text-brand">
                            {obj.objectType}
                          </span>
                          {href ? (
                            <Link
                              href={href}
                              className="block font-medium text-ink hover:text-brand line-clamp-2"
                            >
                              {label}
                            </Link>
                          ) : (
                            <p className="font-medium text-ink line-clamp-2">{label}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {availableSources.length > 0 && (
                  <form onSubmit={handleLinkSource} className="pt-3 border-t border-line space-y-2">
                    <label className="block space-y-1 text-xs">
                      <span className="font-medium text-ink inline-flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Link canonical source
                      </span>
                      <select
                        value={linkSourceId}
                        onChange={(e) => setLinkSourceId(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
                      >
                        {availableSources.map((src) => (
                          <option key={src.id} value={src.id}>
                            {src.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-brand disabled:opacity-50"
                    >
                      Attach source to project
                    </button>
                  </form>
                )}
              </div>
            ),
          },
          {
            id: 'synthesis',
            label: 'Synthesis & Milestones',
            children: (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-canvas/60 p-3">
                  <div className="text-xs">
                    <span className="font-semibold text-ink">Progress:</span>{' '}
                    <span className="text-ink-secondary">
                      {completedCount}/{project.milestones.length} milestones complete
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs">
                    <span className="font-medium text-ink">Stage:</span>
                    <select
                      value={project.stage}
                      disabled={busy}
                      onChange={(e) => handleStageChange(e.target.value as ProjectStage)}
                      className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink"
                    >
                      {PROJECT_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Milestones checklist */}
                <div className="space-y-2.5">
                  <h2 className="text-sm font-semibold text-ink">Project Milestones</h2>
                  <ul className="space-y-2">
                    {project.milestones.map((ms) => (
                      <li
                        key={ms.id}
                        className="rounded-lg border border-line bg-canvas/40 p-3 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCycleMilestone(ms)}
                              aria-label={`Change milestone status for ${ms.title}`}
                              className="text-brand hover:opacity-80"
                            >
                              {ms.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              ) : ms.status === 'IN_PROGRESS' ? (
                                <Clock className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <Circle className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
                              )}
                            </button>
                            <span className="text-sm font-semibold text-ink">{ms.title}</span>
                          </div>
                          {ms.description && (
                            <p className="text-xs text-ink-secondary pl-6">{ms.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 space-y-0.5 text-xs">
                          <span className="inline-block rounded-full border border-line bg-surface px-2 py-0.5 font-medium text-ink">
                            {ms.status.replace(/_/g, ' ')}
                          </span>
                          {ms.dueAt && (
                            <p className="text-ink-secondary">Due {formatShortDate(ms.dueAt)}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <form
                    onSubmit={handleAddMilestone}
                    className="rounded-lg border border-dashed border-line p-3 space-y-2"
                  >
                    <p className="text-xs font-medium text-ink inline-flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add milestone
                    </p>
                    <input
                      type="text"
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      placeholder="Milestone title..."
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                    />
                    <input
                      type="text"
                      value={newMilestoneDesc}
                      onChange={(e) => setNewMilestoneDesc(e.target.value)}
                      placeholder="Optional acceptance notes..."
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                    />
                    <button
                      type="submit"
                      disabled={busy || newMilestoneTitle.trim().length < 3}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-on-primary disabled:opacity-50"
                    >
                      Save milestone
                    </button>
                  </form>
                </div>

                {/* §9 Private Project Working Notes (ProjectNote — distinct from published Contributions) */}
                <div className="space-y-3 border-t border-line pt-5">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">
                      Project Working Notes ({notes.length})
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      Private workspace-scoped scratch notes (ProjectNote). Publishable research
                      notes live as versioned Contributions instead.
                    </p>
                  </div>

                  {notes.length > 0 && (
                    <ul className="space-y-2">
                      {notes.map((n) => (
                        <li
                          key={n.id}
                          className="rounded-lg border border-line bg-canvas/50 p-3 space-y-1 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-ink">{n.title}</span>
                            <span className="font-mono text-ink-secondary">
                              {n.classification} · v{n.version} · {formatShortDate(n.updatedAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-line text-ink-secondary">{n.bodyMarkdown}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form
                    onSubmit={handleSaveProjectNote}
                    className="rounded-lg border border-dashed border-line p-3 space-y-2"
                  >
                    <p className="text-xs font-medium text-ink">Add working note</p>
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Working note title..."
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                    />
                    <textarea
                      rows={2}
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Experiment scratch notes, seed configs, or follow-up checklist..."
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                    />
                    <button
                      type="submit"
                      disabled={busy || noteTitle.trim().length < 2 || noteBody.trim().length < 1}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-on-primary disabled:opacity-50"
                    >
                      Save working note
                    </button>
                  </form>
                </div>

                {/* Scoped Provenance Graph */}
                <ProvenanceGraphExplorer
                  heading="Project Claim–Evidence Provenance"
                  description="Graph of canonical sources, located evidence, claims, and outputs linked to this project."
                  initialObjects={graphObjects}
                  initialRelationships={graphRelationships}
                  initialClaimEvidence={claimEvidence}
                  showFullGraphLink
                />
              </div>
            ),
          },
          {
            id: 'inspector',
            label: 'Team & Governance',
            children: (
              <div className="space-y-4 text-xs">
                <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 space-y-1">
                  <div className="inline-flex items-center gap-1.5 font-semibold text-brand">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Workspace Governance Boundary
                  </div>
                  <p className="text-ink-secondary">
                    Owned by <strong className="text-ink">{project.workspaceName}</strong>. Every
                    project collaborator must first hold active membership in this workspace.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-ink inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Project Collaborators ({project.members.length})
                  </p>
                  <ul className="space-y-1.5">
                    {project.members.map((member) => (
                      <li
                        key={member.userId}
                        className="rounded-lg border border-line bg-canvas/60 px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium text-ink">{member.displayName}</p>
                          <p className="text-ink-secondary">@{member.handle}</p>
                        </div>
                        <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-medium text-ink">
                          {member.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {workspaceMembers.length > 0 && (
                  <form onSubmit={handleAssignMember} className="pt-3 border-t border-line space-y-2">
                    <label className="block space-y-1">
                      <span className="font-medium text-ink">Assign workspace member</span>
                      <select
                        value={selectedWsMemberId}
                        onChange={(e) => setSelectedWsMemberId(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink"
                      >
                        {workspaceMembers.map((wm) => (
                          <option key={wm.userId} value={wm.userId}>
                            {wm.displayName} ({wm.role})
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-brand disabled:opacity-50"
                    >
                      Assign to project
                    </button>
                  </form>
                )}

                <div className="pt-3 border-t border-line space-y-1.5">
                  <p className="font-semibold text-ink">Quick Links</p>
                  <Link
                    href="/contribute"
                    className="block rounded-lg bg-brand px-3 py-2 text-center font-medium text-on-primary hover:opacity-90"
                  >
                    Draft new contribution
                  </Link>
                  <Link
                    href="/graph"
                    className="block rounded-lg border border-line bg-surface px-3 py-2 text-center font-medium text-ink hover:border-brand"
                  >
                    Open full provenance graph
                  </Link>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
