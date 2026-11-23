'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Cloud,
  CloudOff,
  FilePlus2,
  Link2,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  Slash,
  Trash2,
} from 'lucide-react';
import {
  CONTRIBUTION_CATALOG,
  CONTRIBUTION_TYPES,
  evaluatePublicationBlockers,
  type AIProvenance,
  type ContributionType,
  type ResearchBlock,
  type ResearchDocument,
} from '@/lib/v34/contracts';
import { editorDb, type SaveState } from '@/lib/persistence/editor-db';
import { DraftSyncCoordinator, type ConflictDetail } from '@/lib/persistence/sync-coordinator';
import BottomSheet from '@/components/layout/BottomSheet';
import { Field } from '@/components/primitives';

interface ResolvedSourceState {
  id: string;
  versionId: string;
  title: string;
  venue: string | null;
  integrityStatus: 'active' | 'corrected' | 'expression-of-concern' | 'retracted' | 'withdrawn';
  identifierLabel: string | null;
}

interface ContributeWizardProps {
  initialSource?: ResolvedSourceState | null;
}

const SAVE_LABELS: Record<SaveState, string> = {
  editing: 'Editing…',
  saving: 'Saving…',
  saved: 'Saved locally',
  synced: 'Synced',
  offline: 'Offline — saved locally',
  conflict: 'Conflict detected',
  failed: 'Sync retrying',
};

const STEPS = [
  { id: 1, label: 'Type' },
  { id: 2, label: 'Source & Evidence' },
  { id: 3, label: 'Write' },
  { id: 4, label: 'Integrity & Publish' },
] as const;

function createBlockId(): string {
  return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function ContributeWizard({ initialSource = null }: ContributeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [draftId] = useState<string>(() => `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);

  // Core contribution fields
  const [contributionType, setContributionType] = useState<ContributionType>('paper-review');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [blocks, setBlocks] = useState<ResearchBlock[]>([
    {
      id: 'blk-intro',
      type: 'paragraph',
      text: '',
    },
  ]);

  // Source resolution & evidence
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceTitleOverride, setSourceTitleOverride] = useState('');
  const [resolvedSource, setResolvedSource] = useState<ResolvedSourceState | null>(initialSource);
  const [resolvingSource, setResolvingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [evidenceStatement, setEvidenceStatement] = useState('');
  const [evidenceLocatorKind, setEvidenceLocatorKind] = useState<
    'page' | 'section' | 'figure' | 'table' | 'url' | 'repository' | 'commit' | 'line'
  >('section');
  const [evidenceLocatorValue, setEvidenceLocatorValue] = useState('');
  const [evidenceLimitation, setEvidenceLimitation] = useState('');
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [creatingEvidence, setCreatingEvidence] = useState(false);

  // AI Provenance & Retraction acknowledgement
  const [usedAi, setUsedAi] = useState(false);
  const [aiProvider, setAiProvider] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiHumanReviewed, setAiHumanReviewed] = useState(false);
  const [retractionAddressed, setRetractionAddressed] = useState(false);

  // Persistence & Sync state (v3.4 §11)
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [conflict, setConflict] = useState<ConflictDetail | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const coordinatorRef = useRef<DraftSyncCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new DraftSyncCoordinator({
      db: editorDb,
      onStateChange: (nextState) => setSaveState(nextState),
      onConflict: (detail) => setConflict(detail),
    });
  }

  const aiProvenance: AIProvenance = useMemo(
    () => ({
      usedAi,
      provider: usedAi ? aiProvider.trim() || 'Unknown provider' : undefined,
      model: usedAi ? aiModel.trim() || undefined : undefined,
      operation: usedAi ? 'draft-assist' : 'none',
      humanReviewed: usedAi ? aiHumanReviewed : true,
      humanReviewer: aiHumanReviewed ? 'Author' : undefined,
      syntheticDisclosed: true,
    }),
    [aiHumanReviewed, aiModel, aiProvider, usedAi],
  );

  const documentSnapshot: ResearchDocument = useMemo(
    () => ({
      schemaVersion: '1.0',
      id: draftId,
      title: title || 'Untitled Contribution',
      authorId: 'current-user',
      workspaceId: 'personal',
      version: 1,
      createdAt: '2026-11-16T12:00:00.000Z',
      updatedAt: new Date().toISOString(),
      blocks,
    }),
    [blocks, draftId, title],
  );

  // Debounced Layer 1 -> Layer 2 -> Layer 3 autosave (v3.4 §11.1)
  useEffect(() => {
    if (!title.trim() && !summary.trim() && blocks.every((b) => !b.text.trim())) return;
    setSaveState('editing');
    const timer = window.setTimeout(() => {
      void coordinatorRef.current?.saveLocallyAndEnqueue({
        draftId,
        contributionType,
        title: title.trim() || 'Untitled Contribution',
        document: documentSnapshot,
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [blocks, contributionType, documentSnapshot, draftId, summary, title]);

  // Auto-flush queued mutations on browser reconnect (§11.5)
  useEffect(() => {
    const onOnline = () => {
      void coordinatorRef.current?.flush(draftId);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [draftId]);

  const liveBlockers = useMemo(
    () =>
      evaluatePublicationBlockers({
        contributionType,
        title: title.trim(),
        summary: summary.trim(),
        blocks,
        primarySourceId: resolvedSource?.id ?? null,
        primarySourceIntegrity: resolvedSource?.integrityStatus ?? null,
        retractionAddressed,
        aiProvenance,
      }),
    [aiProvenance, blocks, contributionType, resolvedSource, retractionAddressed, summary, title],
  );

  const handleResolveSource = useCallback(async () => {
    if (!sourceQuery.trim()) {
      setSourceError('Enter a DOI, arXiv ID, GitHub repo, or canonical URL.');
      return;
    }
    setResolvingSource(true);
    setSourceError(null);
    try {
      const response = await fetch('/api/sources/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: sourceQuery.trim(),
          title: sourceTitleOverride.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        source?: {
          id: string;
          title: string;
          venue: string | null;
          integrityStatus: ResolvedSourceState['integrityStatus'];
          identifierScheme: string | null;
          identifierValue: string | null;
        };
        version?: { id: string };
      };
      if (!response.ok || !data.source || !data.version) {
        setSourceError(data.error ?? 'Could not resolve source identifier.');
        return;
      }
      setResolvedSource({
        id: data.source.id,
        versionId: data.version.id,
        title: data.source.title,
        venue: data.source.venue,
        integrityStatus: data.source.integrityStatus,
        identifierLabel:
          data.source.identifierScheme && data.source.identifierValue
            ? `${data.source.identifierScheme.toUpperCase()}: ${data.source.identifierValue}`
            : null,
      });
    } catch {
      setSourceError('Network error while resolving source. Draft remains safely stored locally.');
    } finally {
      setResolvingSource(false);
    }
  }, [sourceQuery, sourceTitleOverride]);

  const handleAddEvidence = useCallback(async () => {
    if (!resolvedSource || !evidenceStatement.trim() || !evidenceLocatorValue.trim()) return;
    setCreatingEvidence(true);
    try {
      const response = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: resolvedSource.id,
          sourceVersionId: resolvedSource.versionId,
          statement: evidenceStatement.trim(),
          locator: { kind: evidenceLocatorKind, value: evidenceLocatorValue.trim() },
          extractionType: 'paraphrase',
          limitation: evidenceLimitation.trim() || undefined,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { evidence: { id: string } };
        setEvidenceIds((prev) => [...prev, data.evidence.id]);
      }
      // Always insert structured evidence block into the document too so offline writing never drops evidence.
      setBlocks((prev) => [
        ...prev,
        {
          id: createBlockId(),
          type: 'evidence',
          text: evidenceStatement.trim(),
          sourceId: resolvedSource.id,
          sourceVersionId: resolvedSource.versionId,
          locator: `${evidenceLocatorKind}: ${evidenceLocatorValue.trim()}`,
          limitation: evidenceLimitation.trim() || undefined,
        },
      ]);
      setEvidenceStatement('');
      setEvidenceLocatorValue('');
      setEvidenceLimitation('');
    } finally {
      setCreatingEvidence(false);
    }
  }, [evidenceLimitation, evidenceLocatorKind, evidenceLocatorValue, evidenceStatement, resolvedSource]);

  const updateBlock = (id: string, patch: Partial<ResearchBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const addBlock = (type: ResearchBlock['type']) => {
    setBlocks((prev) => [
      ...prev,
      {
        id: createBlockId(),
        type,
        text: '',
        ...(type === 'heading' ? { level: 2 as const } : {}),
        ...(type === 'evidence' && resolvedSource
          ? { sourceId: resolvedSource.id, sourceVersionId: resolvedSource.versionId, locator: 'Section 1' }
          : {}),
      },
    ]);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== id) : prev));
  };

  const moveBlock = (index: number, delta: -1 | 1) => {
    setBlocks((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });
  };

  const handleResolveConflict = async (strategy: 'keep-client' | 'keep-server' | 'merge') => {
    if (!conflict) return;
    const mergedDoc: ResearchDocument =
      strategy === 'keep-server'
        ? conflict.serverDocument
        : strategy === 'merge'
          ? {
              ...conflict.clientDocument,
              blocks: [...conflict.serverDocument.blocks, ...conflict.clientDocument.blocks],
            }
          : conflict.clientDocument;

    const response = await fetch(`/api/drafts/${encodeURIComponent(draftId)}/resolve-conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy,
        expectedServerVersion: conflict.serverVersion,
        mergedDocument: mergedDoc,
      }),
    });
    if (response.ok) {
      setTitle(mergedDoc.title);
      setBlocks(mergedDoc.blocks);
      setConflict(null);
      setSaveState('synced');
    }
  };

  const handlePublish = async () => {
    if (liveBlockers.length > 0 || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const topics = topicsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const limitations = blocks
        .filter((b) => b.type === 'limitation' && b.text.trim())
        .map((b) => b.text.trim());

      const createRes = await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributionType,
          title: title.trim(),
          summary: summary.trim(),
          document: { ...documentSnapshot, title: title.trim() },
          primarySourceId: resolvedSource?.id ?? null,
          primarySourceVersionId: resolvedSource?.versionId ?? null,
          topics: topics.length ? topics : ['Open Research'],
          tags,
          limitations,
          aiProvenance,
          evidenceIds,
          claimIds: [],
        }),
      });
      const created = (await createRes.json()) as { error?: string; contribution?: { id: string; slug: string } };
      if (!createRes.ok || !created.contribution) {
        setPublishError(created.error ?? 'Could not create contribution.');
        return;
      }

      const publishRes = await fetch(
        `/api/contributions/${encodeURIComponent(created.contribution.id)}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ retractionAddressed, aiProvenance }),
        },
      );
      const pubData = (await publishRes.json()) as {
        error?: string;
        contribution?: { slug: string };
      };
      if (!publishRes.ok || !pubData.contribution) {
        setPublishError(pubData.error ?? 'Publication blocked by integrity checks.');
        return;
      }

      setPublishedSlug(pubData.contribution.slug);
      router.push(`/contribution/${encodeURIComponent(pubData.contribution.slug)}`);
    } catch {
      setPublishError('Network error while publishing. Your draft is safely preserved locally.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper + Live Autosave Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 sm:px-4">
        <ol className="flex flex-wrap items-center gap-1.5" aria-label="Contribution wizard steps">
          {STEPS.map((s) => {
            const active = step === s.id;
            const complete = step > s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  aria-current={active ? 'step' : undefined}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                    active
                      ? 'bg-brand text-on-primary'
                      : complete
                        ? 'bg-brand/10 text-brand'
                        : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                  }`}
                >
                  <span className="font-mono font-semibold">{s.id}.</span>
                  <span>{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1.5 font-mono text-xs text-ink-secondary"
        >
          {saveState === 'offline' ? (
            <CloudOff className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
          ) : saveState === 'saving' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-hidden="true" />
          ) : (
            <Cloud className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
          )}
          <span>{SAVE_LABELS[saveState]}</span>
        </div>
      </div>

      {/* Step 1: Select Contribution Type */}
      {step === 1 ? (
        <section aria-labelledby="step-1-heading" className="space-y-4">
          <div>
            <h2 id="step-1-heading" className="font-serif text-2xl font-semibold text-ink">
              What kind of research contribution are you sharing?
            </h2>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Choose the canonical scholarly format that best matches your evidence and goal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRIBUTION_TYPES.map((type) => {
              const meta = CONTRIBUTION_CATALOG[type];
              const selected = contributionType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContributionType(type)}
                  aria-pressed={selected}
                  className={`flex min-h-28 flex-col justify-between rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    selected
                      ? 'border-brand bg-brand/5'
                      : 'border-line bg-surface hover:border-brand/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans text-sm font-semibold text-ink">{meta.label}</span>
                      {meta.requiresSource ? (
                        <span className="rounded-sm bg-surface-subtle px-2 py-0.5 font-mono text-xs font-semibold uppercase text-ink-secondary">
                          Source req.
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 font-sans text-xs leading-relaxed text-ink-secondary">
                      {meta.shortDescription}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Step 2: Resolve Primary Source & Attach Structured Evidence */}
      {step === 2 ? (
        <section aria-labelledby="step-2-heading" className="space-y-6">
          <div>
            <h2 id="step-2-heading" className="font-serif text-2xl font-semibold text-ink">
              Link a canonical source &amp; extract verifiable evidence
            </h2>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Paste a DOI, arXiv ID, GitHub repository (`owner/repo`), or canonical URL. Every evidence unit keeps an explicit source version and locator.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Field id="source-identifier" label="Source DOI / arXiv / GitHub / URL">
                  <input
                  id="source-identifier"
                  type="text"
                  value={sourceQuery}
                  onChange={(e) => setSourceQuery(e.target.value)}
                  placeholder="e.g. 10.48550/arXiv.2501.12948 or vllm-project/vllm"
                  className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
                  />
                </Field>
              </div>
              <div>
                <Field id="source-title-override" label="Source title (optional override)">
                  <input
                  id="source-title-override"
                  type="text"
                  value={sourceTitleOverride}
                  onChange={(e) => setSourceTitleOverride(e.target.value)}
                  placeholder="Exact paper, repository, or dataset title"
                  className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
                  />
                </Field>
              </div>
            </div>
            {sourceError ? (
              <p role="alert" className="mt-2 font-sans text-xs text-destructive">
                {sourceError}
              </p>
            ) : null}
            <div className="mt-3">
              <button
                type="button"
                onClick={handleResolveSource}
                disabled={resolvingSource}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 py-2 font-sans text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-50"
              >
                {resolvingSource ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Resolve canonical source</span>
              </button>
            </div>

            {resolvedSource ? (
              <div className="mt-4 rounded-md bg-brand/10 p-3">
                <p className="font-mono text-xs font-semibold uppercase text-brand">
                  Attached canonical source {resolvedSource.identifierLabel ? `· ${resolvedSource.identifierLabel}` : ''}
                </p>
                <p className="mt-1 font-sans text-sm font-semibold text-ink">{resolvedSource.title}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-secondary">
                  Integrity status: {resolvedSource.integrityStatus} · Version ID: {resolvedSource.versionId}
                </p>
              </div>
            ) : null}
          </div>

          {resolvedSource ? (
            <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
              <h3 className="font-sans text-sm font-semibold text-ink">Add structured evidence from this source</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <div>
                  <Field id="ev-locator-kind" label="Locator type">
                    <select
                    id="ev-locator-kind"
                    value={evidenceLocatorKind}
                    onChange={(e) => setEvidenceLocatorKind(e.target.value as typeof evidenceLocatorKind)}
                    className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
                  >
                    <option value="page">Page</option>
                    <option value="section">Section</option>
                    <option value="figure">Figure</option>
                    <option value="table">Table</option>
                    <option value="url">URL</option>
                    <option value="repository">Repository</option>
                    <option value="commit">Commit</option>
                    <option value="line">Line reference</option>
                    </select>
                  </Field>
                </div>
                <div>
                  <Field id="ev-locator-value" label="Exact locator">
                    <input
                    id="ev-locator-value"
                    type="text"
                    dir="ltr"
                    value={evidenceLocatorValue}
                    onChange={(e) => setEvidenceLocatorValue(e.target.value)}
                    placeholder="e.g. p. 14, Section 4.2, Table 3, commit a1b2c3d, or L42-L58"
                    className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
                  />
                  </Field>
                </div>
              </div>
              <div className="mt-3">
                <Field id="ev-statement" label="Evidence finding">
                  <textarea
                  id="ev-statement"
                  rows={3}
                  value={evidenceStatement}
                  onChange={(e) => setEvidenceStatement(e.target.value)}
                  placeholder="Summarize the concrete empirical finding, measurement, or quotation…"
                  className="w-full rounded-md border border-line bg-canvas p-3 font-sans text-sm text-ink"
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Field id="ev-limitation" label="Scope / limitation (optional)">
                  <input
                  id="ev-limitation"
                  type="text"
                  value={evidenceLimitation}
                  onChange={(e) => setEvidenceLimitation(e.target.value)}
                  placeholder="e.g. Tested only on English medical abstracts (n=412)"
                  className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={handleAddEvidence}
                disabled={creatingEvidence || !evidenceStatement.trim() || !evidenceLocatorValue.trim()}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-brand bg-brand/10 px-4 py-2 font-sans text-sm font-semibold text-brand hover:bg-brand/15 disabled:opacity-50"
              >
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                <span>Attach evidence block</span>
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Step 3: Compose Structured Document */}
      {step === 3 ? (
        <section aria-labelledby="step-3-heading" className="space-y-4">
          <div>
            <h2 id="step-3-heading" className="font-serif text-2xl font-semibold text-ink">
              Compose your {CONTRIBUTION_CATALOG[contributionType].label}
            </h2>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Your structured blocks are stored as canonical JSON (autosaved locally and synced to the server) and compiled deterministically to safe MDX.
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
            <div>
              <Field id="contrib-title" label="Title" required>
                <input
                id="contrib-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Clear, specific scholarly title…"
                className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-serif text-base text-ink"
                />
              </Field>
            </div>

            <div>
              <Field id="contrib-summary" label="Executive summary (min. 20 characters)" required>
                <textarea
                id="contrib-summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="State the main question, what the evidence shows, and key boundaries…"
                className="w-full rounded-md border border-line bg-canvas p-3 font-sans text-sm text-ink"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Field id="contrib-topics" label="Topics (comma separated)">
                  <input
                  id="contrib-topics"
                  type="text"
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
                  />
                </Field>
              </div>
              <div>
                <Field id="contrib-tags" label="Tags (comma separated)">
                  <input
                  id="contrib-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Structured document blocks
                  </p>
                  <button
                    type="button"
                    onClick={() => setSlashMenuOpen((prev) => !prev)}
                    aria-expanded={slashMenuOpen}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full border border-brand/40 bg-brand/5 px-3.5 py-2 font-mono text-xs font-medium text-brand hover:bg-brand/10"
                  >
                    <Slash className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Slash commands</span>
                  </button>
                  <Link
                    href={`/editor/${encodeURIComponent(draftId)}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3.5 py-2 font-sans text-xs font-medium text-ink hover:border-brand"
                  >
                    Continue in Workspace →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['paragraph', 'heading', 'evidence', 'claim', 'limitation', 'code'] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => addBlock(kind)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line bg-canvas px-3.5 py-2 font-mono text-xs text-ink hover:bg-surface-subtle"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{kind}</span>
                    </button>
                  ))}
                </div>
              </div>

              {slashMenuOpen ? (
                <div
                  role="menu"
                  aria-label="Scholarly slash commands"
                  className="grid gap-2 rounded-lg bg-surface-subtle/60 p-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {(
                    [
                      { kind: 'evidence', cmd: '/evidence', desc: 'Source-version-located observation' },
                      { kind: 'claim', cmd: '/claim', desc: 'Typed scholarly proposition' },
                      { kind: 'limitation', cmd: '/limitation', desc: 'Scope boundary or caveat' },
                      { kind: 'citation', cmd: '/citation', desc: 'Inline canonical source reference' },
                      { kind: 'question', cmd: '/question', desc: 'Open research question' },
                      { kind: 'callout', cmd: '/callout', desc: 'Methodological note' },
                      { kind: 'code', cmd: '/code', desc: 'Reproducible snippet' },
                      { kind: 'heading', cmd: '/heading', desc: 'Section heading' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.cmd}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        addBlock(item.kind);
                        setSlashMenuOpen(false);
                      }}
                      className="min-h-11 rounded-md border border-line bg-surface p-2.5 text-left hover:border-brand"
                    >
                      <span className="block font-mono text-xs font-semibold text-brand">{item.cmd}</span>
                      <span className="mt-0.5 block text-xs text-ink-secondary">{item.desc}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {blocks.map((block, index) => (
                <div key={block.id} className="rounded-md bg-surface-subtle/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold uppercase text-brand">
                      {index + 1}. {block.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move block ${index + 1} up`}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-subtle hover:text-ink disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                        aria-label={`Move block ${index + 1} down`}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-subtle hover:text-ink disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        disabled={blocks.length <= 1}
                        aria-label={`Remove block ${index + 1}`}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-subtle hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={block.type === 'heading' ? 1 : 3}
                    value={block.text}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      if (nextVal === '/') setSlashMenuOpen(true);
                      updateBlock(block.id, { text: nextVal });
                    }}
                    placeholder={`Write ${block.type} content… (type / for slash commands)`}
                    className="w-full rounded-md border border-line bg-surface p-2.5 font-sans text-sm text-ink"
                  />
                  {block.type === 'evidence' ? (
                    <input
                      type="text"
                      value={block.locator ?? ''}
                      onChange={(e) => updateBlock(block.id, { locator: e.target.value })}
                      placeholder="Required source locator (e.g. Section 3.1, Table 2)"
                      className="mt-2 h-11 w-full rounded-md border border-line bg-surface px-3 font-mono text-xs text-ink"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Step 4: AI Disclosure + §16 Integrity Checks + Publish */}
      {step === 4 ? (
        <section aria-labelledby="step-4-heading" className="space-y-5">
          <div>
            <h2 id="step-4-heading" className="font-serif text-2xl font-semibold text-ink">
              AI disclosure &amp; pre-publication integrity check
            </h2>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Every contribution passes transparent integrity gates before entering the public research network.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4 sm:p-5 space-y-3">
            <label className="flex min-h-11 items-center gap-3 font-sans text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={usedAi}
                onChange={(e) => setUsedAi(e.target.checked)}
                className="h-5 w-5 accent-brand"
              />
              <span>AI assistance was used while drafting, summarizing, or checking citations</span>
            </label>

            {usedAi ? (
              <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                <div>
                  <Field id="ai-provider" label="AI provider">
                    <input
                    id="ai-provider"
                    type="text"
                    placeholder="e.g. Google, Anthropic, OpenAI"
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
                  />
                  </Field>
                </div>
                <div>
                  <Field id="ai-model" label="Model name">
                    <input
                    id="ai-model"
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="e.g. gemini-2.5-flash"
                    className="h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink"
                  />
                  </Field>
                </div>
                <label className="flex min-h-11 items-center gap-3 font-sans text-sm text-ink sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={aiHumanReviewed}
                    onChange={(e) => setAiHumanReviewed(e.target.checked)}
                    className="h-5 w-5 accent-brand"
                  />
                  <span>I have personally reviewed and verified all AI-assisted claims and citations</span>
                </label>
              </div>
            ) : null}

            {resolvedSource &&
            (resolvedSource.integrityStatus === 'retracted' ||
              resolvedSource.integrityStatus === 'withdrawn') ? (
              <label className="flex min-h-11 items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 font-sans text-xs text-destructive">
                <input
                  type="checkbox"
                  checked={retractionAddressed}
                  onChange={(e) => setRetractionAddressed(e.target.checked)}
                  className="h-5 w-5 accent-destructive"
                />
                <span>
                  I explicitly address this source’s retraction status in the contribution body.
                </span>
              </label>
            ) : null}
          </div>

          <div className="rounded-lg border border-line bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand" aria-hidden="true" />
              <h3 className="font-sans text-sm font-semibold text-ink">Publication gate status</h3>
            </div>
            {liveBlockers.length === 0 ? (
              <p className="mt-2 flex items-center gap-2 font-sans text-sm text-trust-verified">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>All integrity checks passed. Ready to publish to the Research Network.</span>
              </p>
            ) : (
              <ul className="mt-3 space-y-2" role="alert">
                {liveBlockers.map((blocker) => (
                  <li
                    key={blocker.code}
                    className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 font-sans text-xs text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{blocker.message}</span>
                  </li>
                ))}
              </ul>
            )}

            {publishError ? (
              <p role="alert" className="mt-3 font-sans text-xs font-medium text-destructive">
                {publishError}
              </p>
            ) : null}

            {publishedSlug ? (
              <p className="mt-3 font-sans text-sm text-brand">
                Published!{' '}
                <Link href={`/contribution/${publishedSlug}`} className="underline">
                  View your contribution
                </Link>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Wizard Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
          disabled={step === 1}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 font-sans text-sm font-medium text-ink hover:bg-surface-subtle disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back</span>
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => ((s + 1) as 1 | 2 | 3 | 4))}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 py-2 font-sans text-sm font-medium text-canvas hover:opacity-90"
          >
            <span>Continue</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePublish}
            disabled={liveBlockers.length > 0 || publishing}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-6 py-2 font-sans text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-40"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Publish contribution</span>
          </button>
        )}
      </div>

      {/* Conflict Resolution Sheet (v3.4 §11.7) */}
      <BottomSheet
        open={Boolean(conflict)}
        onClose={() => setConflict(null)}
        title="Resolve draft version conflict"
        description="Another session saved a newer version. Both versions have been preserved safely."
      >
        {conflict ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-line bg-surface p-3">
                <p className="font-mono text-xs font-semibold uppercase text-brand">Your local version</p>
                <p className="mt-1 font-sans text-sm font-semibold text-ink">{conflict.clientDocument.title}</p>
                <p className="mt-1 font-mono text-xs text-ink-secondary">
                  {conflict.clientDocument.blocks.length} block(s)
                </p>
              </div>
              <div className="rounded-md border border-line bg-surface p-3">
                <p className="font-mono text-xs font-semibold uppercase text-ink-secondary">
                  Server version (v{conflict.serverVersion})
                </p>
                <p className="mt-1 font-sans text-sm font-semibold text-ink">{conflict.serverDocument.title}</p>
                <p className="mt-1 font-mono text-xs text-ink-secondary">
                  {conflict.serverDocument.blocks.length} block(s)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleResolveConflict('keep-client')}
                className="inline-flex min-h-11 items-center rounded-full bg-brand px-4 py-2 font-sans text-xs font-semibold text-on-primary"
              >
                Keep my version
              </button>
              <button
                type="button"
                onClick={() => void handleResolveConflict('keep-server')}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-4 py-2 font-sans text-xs font-medium text-ink"
              >
                Keep server version
              </button>
              <button
                type="button"
                onClick={() => void handleResolveConflict('merge')}
                className="inline-flex min-h-11 items-center rounded-full border border-brand bg-brand/10 px-4 py-2 font-sans text-xs font-semibold text-brand"
              >
                Merge blocks
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
