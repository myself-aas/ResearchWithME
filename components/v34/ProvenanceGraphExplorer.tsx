'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, ExternalLink, GitBranch, RefreshCw, Sparkles, X } from 'lucide-react';
import ProvenanceGraph from '@/components/graph/ProvenanceGraph';
import type { KnowledgeRelationship } from '@/lib/schemas/scholarly';
import type { ClaimEvidenceLink } from '@/lib/v34/store';
import type { ProvenanceGraphPayload } from '@/lib/v34/scholarly-adapter';

interface ProvenanceGraphExplorerProps {
  heading?: string;
  description?: string;
  initialObjects: ProvenanceGraphPayload['objects'];
  initialRelationships: KnowledgeRelationship[];
  initialClaimEvidence: ClaimEvidenceLink[];
  showFullGraphLink?: boolean;
}

type EdgeFilter = 'all' | 'supports' | 'contradicts' | 'relates-to' | 'inferred';

export function ProvenanceGraphExplorer({
  heading = 'Claim–Evidence Provenance Graph',
  description = 'Inspect how primary sources, located evidence units, claims, and contributions connect. Keyboard-navigable list view is default; switch to Graph view at any time.',
  initialObjects,
  initialRelationships,
  initialClaimEvidence,
  showFullGraphLink = false,
}: ProvenanceGraphExplorerProps) {
  const [claimEvidence, setClaimEvidence] = useState<ClaimEvidenceLink[]>(initialClaimEvidence);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>(initialRelationships);
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialObjects[0]?.id ?? null);
  const [curatingKey, setCuratingKey] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [projectionMeta, setProjectionMeta] = useState<{
    nodes: number;
    edges: number;
    rebuiltAt: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleRebuildProjection() {
    if (rebuilding) return;
    setRebuilding(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/graph/rebuild', { method: 'POST' });
      const data = (await res.json()) as {
        rebuilt?: boolean;
        nodeCount?: number;
        edgeCount?: number;
        projection?: { rebuiltAt: string; rebuildDurationMs: number };
        error?: string;
      };
      if (!res.ok || !data.rebuilt) {
        setStatusMessage(data.error || 'Could not rebuild graph projection.');
        return;
      }
      setProjectionMeta({
        nodes: data.nodeCount ?? 0,
        edges: data.edgeCount ?? 0,
        rebuiltAt: data.projection?.rebuiltAt ?? new Date().toISOString(),
      });
      setStatusMessage(
        `Rebuilt graph read projection from canonical tables (${data.nodeCount ?? 0} nodes, ${data.edgeCount ?? 0} edges in ${data.projection?.rebuildDurationMs ?? 1}ms).`,
      );
    } catch {
      setStatusMessage('Network error while rebuilding graph projection.');
    } finally {
      setRebuilding(false);
    }
  }

  const objectById = useMemo(
    () => new Map(initialObjects.map((item) => [item.id, item])),
    [initialObjects],
  );

  const filteredRelationships = useMemo(() => {
    return relationships.filter((rel) => {
      if (edgeFilter === 'all') return true;
      if (edgeFilter === 'inferred') return Boolean(rel.inferred);
      return rel.label === edgeFilter;
    });
  }, [relationships, edgeFilter]);

  const proposedLinks = useMemo(
    () => claimEvidence.filter((link) => link.status === 'PROPOSED'),
    [claimEvidence],
  );

  const selectedObject = selectedId ? objectById.get(selectedId) ?? null : null;
  const connectedEdges = useMemo(() => {
    if (!selectedId) return [];
    return relationships.filter((r) => r.fromId === selectedId || r.toId === selectedId);
  }, [relationships, selectedId]);

  async function curateProposedEdge(
    link: ClaimEvidenceLink,
    nextStatus: 'ACCEPTED' | 'REJECTED',
  ) {
    const key = `${link.claimId}:${link.evidenceId}:${link.relationship}`;
    setCuratingKey(key);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/relationships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: link.claimId,
          evidenceId: link.evidenceId,
          relationship: link.relationship,
          status: nextStatus,
        }),
      });
      const payload = (await response.json()) as {
        relationship?: ClaimEvidenceLink;
        error?: string;
      };
      if (!response.ok || !payload.relationship) {
        setStatusMessage(payload.error || 'Could not update relationship status.');
        return;
      }

      const updated = payload.relationship;
      setClaimEvidence((prev) =>
        prev.map((item) =>
          item.claimId === updated.claimId &&
          item.evidenceId === updated.evidenceId &&
          item.relationship === updated.relationship
            ? updated
            : item,
        ),
      );

      const relId = `rel-ce-${updated.claimId}-${updated.evidenceId}-${updated.relationship}`;
      if (nextStatus === 'REJECTED') {
        setRelationships((prev) => prev.filter((r) => r.id !== relId));
        setStatusMessage('AI-suggested edge rejected and removed from active provenance.');
      } else {
        setRelationships((prev) =>
          prev.map((r) =>
            r.id === relId
              ? {
                  ...r,
                  inferred: false,
                  explanation: `${updated.relationship} (human accepted)`,
                }
              : r,
          ),
        );
        setStatusMessage('AI-suggested edge accepted and promoted to verified provenance.');
      }
    } catch {
      setStatusMessage('Network error while updating edge status.');
    } finally {
      setCuratingKey(null);
    }
  }

  return (
    <section
      aria-label={heading}
      className="rounded-xl border border-line bg-surface p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            Scholarly Provenance
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink">{heading}</h2>
          <p className="text-sm text-ink-secondary max-w-2xl">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRebuildProjection()}
            disabled={rebuilding}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:border-brand hover:text-brand disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${rebuilding ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{rebuilding ? 'Rebuilding…' : 'Rebuild projection'}</span>
          </button>
          {showFullGraphLink && (
            <Link
              href="/graph"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-brand hover:text-brand"
            >
              Open full graph explorer
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {projectionMeta ? (
        <p className="font-mono text-xs text-ink-secondary">
          Derived read projection verified: {projectionMeta.nodes} canonical nodes · {projectionMeta.edges} edges (zero self-edges) · rebuilt at {projectionMeta.rebuiltAt}
        </p>
      ) : null}

      {/* Filter pills — explicit text labels, never color-only */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter provenance relationships">
        {(
          [
            ['all', `All edges (${relationships.length})`],
            ['supports', 'Supports'],
            ['contradicts', 'Contradicts'],
            ['relates-to', 'Qualifies / relates'],
            ['inferred', `AI proposed (${proposedLinks.length})`],
          ] as Array<[EdgeFilter, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setEdgeFilter(key)}
            aria-pressed={edgeFilter === key}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              edgeFilter === key
                ? 'border-brand bg-brand text-on-primary'
                : 'border-line bg-surface text-ink-secondary hover:border-brand hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main ProvenanceGraph + Inspector grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="min-w-0 overflow-x-auto lg:col-span-8">
          <ProvenanceGraph
            objects={initialObjects}
            relationships={filteredRelationships}
            onInspect={setSelectedId}
          />
        </div>

        <aside
          aria-label="Selected provenance object"
          className="lg:col-span-4 rounded-xl border border-line bg-canvas/60 p-4 space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            Node Inspector
          </p>
          {selectedObject ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold uppercase text-brand">
                  {selectedObject.type}
                </span>
                <h3 className="text-sm font-semibold text-ink leading-snug">
                  {selectedObject.title}
                </h3>
                {selectedObject.subtitle && (
                  <p className="text-xs text-ink-secondary">{selectedObject.subtitle}</p>
                )}
              </div>

              {selectedObject.href && (
                <Link
                  href={selectedObject.href}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                >
                  Open canonical record
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}

              <div className="pt-2 border-t border-line space-y-2">
                <p className="text-xs font-semibold text-ink">
                  Connected relationships ({connectedEdges.length})
                </p>
                {connectedEdges.length === 0 ? (
                  <p className="text-xs text-ink-secondary">No edges attached to this node yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {connectedEdges.map((edge) => {
                      const fromTitle = objectById.get(edge.fromId)?.title ?? edge.fromId;
                      const toTitle = objectById.get(edge.toId)?.title ?? edge.toId;
                      return (
                        <li
                          key={edge.id}
                          className="rounded-lg border border-line bg-surface p-2 space-y-0.5"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-ink">{edge.label}</span>
                            {edge.inferred && (
                              <span className="rounded border border-brand/40 bg-brand/10 px-1.5 py-0.5 text-xs text-brand">
                                AI proposed
                              </span>
                            )}
                          </div>
                          <p className="text-ink-secondary line-clamp-2">
                            {fromTitle} → {toTitle}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-secondary">
              Select any node in the list or graph view to inspect its provenance chain.
            </p>
          )}
        </aside>
      </div>

      {/* Human Curation Queue for AI-Proposed Edges (v3.4 Acceptance Criterion E) */}
      {proposedLinks.length > 0 && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Pending Human Curation ({proposedLinks.length} AI-proposed relationship
              {proposedLinks.length === 1 ? '' : 's'})
            </div>
            <span className="text-xs text-ink-secondary">
              AI-suggested links stay PROPOSED until a human accepts or rejects them.
            </span>
          </div>

          <ul className="space-y-2">
            {proposedLinks.map((link) => {
              const key = `${link.claimId}:${link.evidenceId}:${link.relationship}`;
              const evidenceLabel = objectById.get(link.evidenceId)?.title ?? link.evidenceId;
              const claimLabel = objectById.get(link.claimId)?.title ?? link.claimId;
              const busy = curatingKey === key;

              return (
                <li
                  key={key}
                  className="rounded-lg border border-line bg-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-canvas border border-line px-2 py-0.5 font-semibold text-ink">
                        {link.relationship}
                      </span>
                      <span className="text-ink-secondary">
                        Status: PROPOSED
                        {link.confidence !== null
                          ? ` · confidence ${(link.confidence * 100).toFixed(0)}%`
                          : ''}
                      </span>
                    </div>
                    <p className="text-ink">
                      <span className="font-medium">Evidence:</span> {evidenceLabel}
                    </p>
                    <p className="text-ink">
                      <span className="font-medium">Claim:</span> {claimLabel}
                    </p>
                    {link.rationale && <p className="text-ink-secondary">{link.rationale}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => curateProposedEdge(link, 'ACCEPTED')}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Accept edge
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => curateProposedEdge(link, 'REJECTED')}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Reject edge
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {statusMessage && (
        <p role="status" className="text-xs font-medium text-brand">
          {statusMessage}
        </p>
      )}
    </section>
  );
}
