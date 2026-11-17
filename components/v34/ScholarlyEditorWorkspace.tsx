'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  CloudOff,
  FileCode2,
  GripVertical,
  History,
  PanelLeft,
  PanelRight,
  Plus,
  Redo2,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import BottomSheet from '@/components/layout/BottomSheet';
import {
  BLOCK_TYPES,
  CONTRIBUTION_TYPE_CATALOG,
  evaluatePublicationBlockers,
  normalizeScholarlyIdentifier,
  serializeResearchDocumentToMdx,
  type ContributionType,
  type ResearchBlock,
  type ResearchBlockType,
  type ResearchDocument,
} from '@/lib/v34/contracts';
import { validateAndSanitizeMdx } from '@/lib/v34/mdx-security';
import { editorDb, type SaveState } from '@/lib/persistence/editor-db';
import { DraftSyncCoordinator, type ConflictDetail } from '@/lib/persistence/sync-coordinator';

export interface EditorSourceOption {
  id: string;
  title: string;
  authors: string[];
  venue: string | null;
  identifierScheme: string | null;
  identifierValue: string | null;
  integrityStatus: string;
}

interface SnapshotSummary {
  id: string;
  version: number;
  reason: string;
  createdAt: string;
  document?: ResearchDocument;
}

interface ScholarlyEditorWorkspaceProps {
  initialDraftId: string;
  initialSources: EditorSourceOption[];
}

const SLASH_BLOCK_CATALOG: Array<{
  type: ResearchBlockType;
  label: string;
  hint: string;
  defaultText: string;
}> = [
  { type: 'paragraph', label: 'Paragraph', hint: 'Narrative prose', defaultText: '' },
  { type: 'heading', label: 'Section heading', hint: 'Structured section title', defaultText: 'Methods & Findings' },
  { type: 'evidence', label: 'Evidence block', hint: 'Source-version + locator grounded observation', defaultText: '' },
  { type: 'claim', label: 'Claim block', hint: 'Testable empirical or causal proposition', defaultText: '' },
  { type: 'citation', label: 'Citation anchor', hint: 'Direct DOI / arXiv / PMID reference', defaultText: '' },
  { type: 'limitation', label: 'Limitation', hint: 'Scope boundary or threat to validity', defaultText: '' },
  { type: 'question', label: 'Open question', hint: 'Unresolved inquiry for peer review', defaultText: '' },
  { type: 'tool_review', label: 'Tool review', hint: 'Repository evaluation, license & reproducibility', defaultText: '' },
  { type: 'table', label: 'Data table', hint: 'Structured comparison or benchmark table', defaultText: '| Metric | Baseline | Observed |\n| --- | --- | --- |\n| Accuracy | 0.0% | 0.0% |' },
  { type: 'equation', label: 'Equation (LaTeX)', hint: 'Formal mathematical expression', defaultText: 'E = mc^2' },
  { type: 'diagram', label: 'Diagram (Mermaid)', hint: 'Structured workflow or provenance diagram', defaultText: 'graph LR\n  Source --> Evidence --> Claim' },
  { type: 'code', label: 'Code / snippet', hint: 'Reproducible command or implementation note', defaultText: '' },
  { type: 'callout', label: 'Editorial callout', hint: 'Methodology or disclosure note', defaultText: '' },
];

function createEmptyDocument(draftId: string, primarySourceId?: string): ResearchDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: '1.0',
    id: draftId,
    title: '',
    authorId: 'current-researcher',
    workspaceId: 'personal',
    version: 1,
    createdAt: now,
    updatedAt: now,
    blocks: [
      {
        id: 'blk-intro-1',
        type: 'paragraph',
        text: '',
      },
      {
        id: 'blk-ev-1',
        type: 'evidence',
        text: '',
        sourceId: primarySourceId,
        locator: 'Section 1',
      },
      {
        id: 'blk-lim-1',
        type: 'limitation',
        text: '',
      },
    ],
  };
}

export default function ScholarlyEditorWorkspace({
  initialDraftId,
  initialSources,
}: ScholarlyEditorWorkspaceProps) {
  const [contributionType, setContributionType] = useState<ContributionType>('paper-review');
  const [summary, setSummary] = useState('');
  const [primarySourceId, setPrimarySourceId] = useState<string>(initialSources[0]?.id ?? '');
  const [identifierInput, setIdentifierInput] = useState('');
  const [doc, setDoc] = useState<ResearchDocument>(() =>
    createEmptyDocument(initialDraftId, initialSources[0]?.id),
  );
  const [undoStack, setUndoStack] = useState<ResearchDocument[]>([]);
  const [redoStack, setRedoStack] = useState<ResearchDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'canvas' | 'mdx'>('canvas');
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<'review' | 'assistant' | 'history'>('review');
  const [mobileSheet, setMobileSheet] = useState<null | 'sources' | 'review' | 'assistant' | 'history'>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [pendingMutations, setPendingMutations] = useState(0);
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  const [conflict, setConflict] = useState<ConflictDetail | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [assistantResult, setAssistantResult] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [retractionAddressed, setRetractionAddressed] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const queued = await editorDb.getMutationsForDraft(initialDraftId);
      setPendingMutations(queued.length);
    } catch {
      // Ignore if IndexedDB is unavailable
    }
  }, [initialDraftId]);

  const coordinatorRef = useRef<DraftSyncCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new DraftSyncCoordinator({
      onStateChange: (nextState) => {
        setSaveState(nextState);
        // Announce meaningful milestones sparingly — never per keystroke (Part I §13)
        if (nextState === 'synced') setPoliteAnnouncement('Draft synced');
        else if (nextState === 'saved' || nextState === 'offline') {
          setPoliteAnnouncement('Draft saved locally');
        }
        void refreshPendingCount();
      },
      onConflict: (detail) => {
        setConflict(detail);
        setPoliteAnnouncement('A newer draft version is available');
      },
    });
  }

  // Hydrate shared draft from IndexedDB (shared output with ContributeWizard per ADR-032-02)
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const local = await editorDb.getDraft(initialDraftId);
        if (active && local?.document) {
          setDoc(local.document);
          setContributionType(local.contributionType);
          setSaveState(local.saveState);
          const localSnaps = await editorDb.listSnapshotsForDraft(initialDraftId);
          if (active) {
            setSnapshots(
              localSnaps.map((s) => ({
                id: s.id,
                version: s.version,
                reason: s.reason,
                createdAt: s.createdAt,
                document: s.document,
              })),
            );
          }
        }
        if (active) {
          await refreshPendingCount();
        }
      } catch {
        // Fallback to starter document when IndexedDB is unavailable
      }
    })();

    const onOnline = () => {
      void coordinatorRef.current?.flush(initialDraftId).then(() => refreshPendingCount());
    };
    window.addEventListener('online', onOnline);
    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
    };
  }, [initialDraftId, refreshPendingCount]);

  const primarySource = useMemo(
    () => initialSources.find((s) => s.id === primarySourceId) ?? null,
    [initialSources, primarySourceId],
  );

  const parsedIdentifier = useMemo(
    () => (identifierInput.trim() ? normalizeScholarlyIdentifier(identifierInput) : null),
    [identifierInput],
  );

  const serializedMdx = useMemo(() => serializeResearchDocumentToMdx(doc), [doc]);
  const mdxValidation = useMemo(() => validateAndSanitizeMdx(serializedMdx), [serializedMdx]);

  const blockers = useMemo(
    () =>
      evaluatePublicationBlockers({
        contributionType,
        title: doc.title,
        summary,
        blocks: doc.blocks,
        primarySourceId: primarySourceId || null,
        primarySourceIntegrity: primarySource?.integrityStatus ?? null,
        retractionAddressed,
        aiProvenance: null,
      }),
    [contributionType, doc.title, doc.blocks, summary, primarySourceId, primarySource, retractionAddressed],
  );

  const persistNow = useCallback(
    async (nextDoc: ResearchDocument) => {
      try {
        await coordinatorRef.current?.saveLocallyAndEnqueue({
          draftId: initialDraftId,
          contributionType,
          title: nextDoc.title || 'Untitled scholarly draft',
          document: nextDoc,
        });
      } catch {
        setSaveState('offline');
      }
    },
    [initialDraftId, contributionType],
  );

  const updateDoc = useCallback(
    (updater: (prev: ResearchDocument) => ResearchDocument) => {
      setDoc((prev) => {
        setUndoStack((stack) => [...stack.slice(-29), prev]);
        setRedoStack([]);
        const next = updater({ ...prev, updatedAt: new Date().toISOString() });
        void persistNow(next);
        return next;
      });
    },
    [persistNow],
  );

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setDoc((current) => {
        setRedoStack((r) => [...r.slice(-29), current]);
        void persistNow(previous);
        return previous;
      });
      return stack.slice(0, -1);
    });
  }, [persistNow]);

  const handleRedo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setDoc((current) => {
        setUndoStack((u) => [...u.slice(-29), current]);
        void persistNow(next);
        return next;
      });
      return stack.slice(0, -1);
    });
  }, [persistNow]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const addBlock = useCallback(
    (type: ResearchBlockType, insertAfterIndex?: number) => {
      const template = SLASH_BLOCK_CATALOG.find((item) => item.type === type);
      const newBlock: ResearchBlock = {
        id: `blk-${type}-${Date.now().toString(36)}`,
        type,
        text: template?.defaultText ?? '',
        ...(type === 'heading' ? { level: 2 } : {}),
        ...(type === 'evidence' || type === 'citation'
          ? { sourceId: primarySourceId || undefined, locator: '' }
          : {}),
        ...(type === 'claim' ? { relation: 'SUPPORTS' as const } : {}),
      };
      updateDoc((prev) => {
        const nextBlocks = [...prev.blocks];
        if (typeof insertAfterIndex === 'number' && insertAfterIndex >= 0) {
          nextBlocks.splice(insertAfterIndex + 1, 0, newBlock);
        } else {
          nextBlocks.push(newBlock);
        }
        return { ...prev, blocks: nextBlocks };
      });
      setSlashOpen(false);
      setSlashFilter('');
    },
    [primarySourceId, updateDoc],
  );

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<ResearchBlock>) => {
      updateDoc((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
      }));
    },
    [updateDoc],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      updateDoc((prev) => ({
        ...prev,
        blocks: prev.blocks.length > 1 ? prev.blocks.filter((b) => b.id !== blockId) : prev.blocks,
      }));
    },
    [updateDoc],
  );

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateDoc((prev) => {
        if (toIndex < 0 || toIndex >= prev.blocks.length || fromIndex === toIndex) return prev;
        const nextBlocks = [...prev.blocks];
        const [moved] = nextBlocks.splice(fromIndex, 1);
        nextBlocks.splice(toIndex, 0, moved);
        setPoliteAnnouncement(`Block moved to position ${toIndex + 1} of ${nextBlocks.length}`);
        return { ...prev, blocks: nextBlocks };
      });
    },
    [updateDoc],
  );

  const createSnapshot = useCallback(async () => {
    const snap: SnapshotSummary = {
      id: `snap-${Date.now().toString(36)}`,
      version: doc.version,
      reason: 'manual',
      createdAt: new Date().toISOString(),
      document: doc,
    };
    try {
      await editorDb.putSnapshot({
        id: snap.id,
        draftId: initialDraftId,
        version: snap.version,
        document: doc,
        createdAt: snap.createdAt,
        reason: 'manual',
      });
    } catch {
      // Keep snapshot in memory if IndexedDB is unavailable
    }
    setSnapshots((prev) => [snap, ...prev]);
    setStatusMessage(`Snapshot saved at version ${snap.version}.`);
  }, [doc, initialDraftId]);

  const restoreSnapshot = useCallback(
    (snap: SnapshotSummary) => {
      if (!snap.document) return;
      updateDoc(() => ({
        ...snap.document!,
        updatedAt: new Date().toISOString(),
      }));
      setStatusMessage(`Restored snapshot ${snap.id}.`);
    },
    [updateDoc],
  );

  const resolveConflict = useCallback(
    (strategy: 'keep-local' | 'accept-server' | 'merge-both') => {
      if (!conflict) return;
      if (strategy === 'accept-server') {
        updateDoc(() => ({ ...conflict.serverDocument, version: conflict.serverVersion }));
      } else if (strategy === 'merge-both') {
        const seen = new Set(conflict.clientDocument.blocks.map((b) => b.id));
        const extraServerBlocks = conflict.serverDocument.blocks.filter((b) => !seen.has(b.id));
        updateDoc(() => ({
          ...conflict.clientDocument,
          version: Math.max(conflict.clientDocument.version, conflict.serverVersion) + 1,
          blocks: [...conflict.clientDocument.blocks, ...extraServerBlocks],
        }));
      } else {
        updateDoc((prev) => ({ ...prev, version: conflict.serverVersion + 1 }));
      }
      setConflict(null);
      setStatusMessage(`Conflict resolved (${strategy}).`);
    },
    [conflict, updateDoc],
  );

  const runContextualValidation = useCallback(async (kind: 'citations' | 'entailment') => {
    setAssistantResult('Running source-grounded verification…');
    try {
      if (kind === 'citations') {
        const res = await fetch('/api/ai/validate-citations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: serializedMdx,
            sourceIds: primarySourceId ? [primarySourceId] : [],
          }),
        });
        const data = (await res.json()) as { valid?: boolean; summary?: string; error?: string };
        setAssistantResult(
          res.ok
            ? data.summary ?? 'Citation check completed. Review flagged locators before publishing.'
            : data.error ?? 'Sign in to run server-side citation verification.',
        );
      } else {
        const evidenceBlock = doc.blocks.find((b) => b.type === 'evidence');
        const claimBlock = doc.blocks.find((b) => b.type === 'claim');
        const res = await fetch('/api/ai/check-entailment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            premise: evidenceBlock?.text || 'Primary source observation',
            hypothesis: claimBlock?.text || doc.title || 'Draft claim',
          }),
        });
        const data = (await res.json()) as { verdict?: string; rationale?: string; error?: string };
        setAssistantResult(
          res.ok
            ? `Entailment check: ${data.verdict ?? 'reviewed'} — ${data.rationale ?? 'Verified against attached evidence.'}`
            : data.error ?? 'Sign in to run entailment verification.',
        );
      }
    } catch {
      setAssistantResult('Verification service is offline; draft remains safely persisted locally.');
    }
  }, [serializedMdx, primarySourceId, doc.blocks, doc.title]);

  const filteredSlashItems = useMemo(() => {
    const q = slashFilter.trim().toLowerCase();
    if (!q) return SLASH_BLOCK_CATALOG;
    return SLASH_BLOCK_CATALOG.filter(
      (item) => item.label.toLowerCase().includes(q) || item.type.includes(q),
    );
  }, [slashFilter]);

  const sourcesPaneContent = (
    <div className="space-y-4">
      <div>
        <label htmlFor="editor-primary-source" className="block text-xs font-semibold text-ink">
          Primary Canonical Source
        </label>
        <select
          id="editor-primary-source"
          value={primarySourceId}
          onChange={(e) => setPrimarySourceId(e.target.value)}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink"
        >
          <option value="">None selected</option>
          {initialSources.map((src) => (
            <option key={src.id} value={src.id}>
              {src.title} ({src.integrityStatus})
            </option>
          ))}
        </select>
      </div>

      {primarySource && (
        <div className="rounded-lg bg-surface-subtle/60 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{primarySource.title}</span>
            <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-ink-secondary">
              {primarySource.integrityStatus}
            </span>
          </div>
          <p className="text-ink-secondary">{primarySource.authors.join(', ')}</p>
          {primarySource.identifierValue && (
            <p className="font-mono text-ink-secondary" dir="ltr">
              {primarySource.identifierScheme?.toUpperCase()}: {primarySource.identifierValue}
            </p>
          )}
          {(primarySource.integrityStatus === 'retracted' ||
            primarySource.integrityStatus === 'withdrawn') && (
            <label className="mt-2 flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                checked={retractionAddressed}
                onChange={(e) => setRetractionAddressed(e.target.checked)}
              />
              <span>Retraction / withdrawal explicitly addressed in draft</span>
            </label>
          )}
        </div>
      )}

      <div className="space-y-1.5 border-t border-line pt-3">
        <label htmlFor="editor-id-normalizer" className="block text-xs font-semibold text-ink">
          Normalize Scholarly Identifier
        </label>
        <input
          id="editor-id-normalizer"
          type="text"
          value={identifierInput}
          onChange={(e) => setIdentifierInput(e.target.value)}
          placeholder="DOI, ORCID, PMID, PMCID, arXiv, ISBN, ROR, RRID…"
          className="min-h-11 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink"
        />
        {parsedIdentifier && (
          <div className="rounded-lg bg-surface-subtle/60 p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-brand uppercase">
                {parsedIdentifier.scheme}
              </span>
              <span className="font-mono text-ink-secondary">
                {parsedIdentifier.checksumValid ? 'checksum ok' : 'check digit warning'}
              </span>
            </div>
            <p className="break-all font-mono text-ink" dir="ltr">
              {parsedIdentifier.value}
            </p>
            <button
              type="button"
              onClick={() => {
                addBlock('citation');
                setIdentifierInput('');
                setStatusMessage(`Inserted citation anchor for ${parsedIdentifier.scheme.toUpperCase()}: ${parsedIdentifier.value}`);
              }}
              className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-md border border-line bg-surface px-3 py-2 text-xs font-medium text-ink hover:border-brand"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Insert Citation Block
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const reviewPaneContent = (
    <div className="space-y-4">
      <div className="rounded-lg bg-surface-subtle/60 p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink">MDX Security Guard</span>
          <span className="font-mono text-brand">
            {mdxValidation.safe ? 'PASS' : `${mdxValidation.violations.length} issue(s)`}
          </span>
        </div>
        {!mdxValidation.safe && (
          <ul className="list-disc pl-4 text-ink-secondary">
            {mdxValidation.violations.map((v, idx) => (
              <li key={`${v.code}-${idx}`}>{v.message}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-ink">
          Publication Preconditions ({blockers.length} blocker{blockers.length === 1 ? '' : 's'})
        </h3>
        {blockers.length === 0 ? (
          <p className="flex items-center gap-1.5 rounded-lg bg-surface-subtle/60 p-3 text-xs text-ink">
            <CheckCircle2 className="h-4 w-4 text-brand shrink-0" aria-hidden="true" />
            All publication blockers satisfied. Ready for submission or formal review.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg bg-surface-subtle/60 px-3">
            {blockers.map((b) => (
              <li
                key={b.code}
                className="flex items-start gap-2 py-2.5 text-xs text-ink-secondary"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                <span>{b.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const assistantPaneContent = (
    <div className="space-y-3 text-xs">
      <p className="text-ink-secondary">
        Contextual scholarly assistant: verifies citations and evidence entailment without silently
        overwriting your canonical draft.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runContextualValidation('citations')}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-medium text-ink hover:border-brand"
        >
          <ShieldCheck className="h-4 w-4 text-brand" aria-hidden="true" />
          Validate Citations
        </button>
        <button
          type="button"
          onClick={() => void runContextualValidation('entailment')}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-medium text-ink hover:border-brand"
        >
          <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />
          Check Entailment
        </button>
      </div>
      {assistantResult && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg bg-surface-subtle/60 p-3 text-ink"
        >
          {assistantResult}
        </div>
      )}
      <Link
        href="/assistant"
        className="inline-flex min-h-11 items-center gap-1 font-medium text-brand hover:underline"
      >
        Open full-screen Assistant workspace →
      </Link>
    </div>
  );

  const historyPaneContent = (
    <div className="space-y-3 text-xs">
      <button
        type="button"
        onClick={() => void createSnapshot()}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 font-medium text-ink hover:border-brand"
      >
        <Save className="h-4 w-4 text-brand" aria-hidden="true" />
        Capture Snapshot
      </button>
      {snapshots.length === 0 ? (
        <p className="text-ink-secondary">No snapshots recorded yet for this draft.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg bg-surface-subtle/60 px-3">
          {snapshots.map((snap) => (
            <li
              key={snap.id}
              className="flex items-center justify-between gap-2 py-2.5"
            >
              <div>
                <p className="font-mono font-semibold text-ink">v{snap.version} · {snap.reason}</p>
                <p className="text-ink-secondary">{snap.createdAt.slice(0, 19).replace('T', ' ')}</p>
              </div>
              {snap.document && (
                <button
                  type="button"
                  onClick={() => restoreSnapshot(snap)}
                  className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-3 py-2 font-medium text-ink hover:border-brand"
                >
                  Restore
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <span role="status" aria-live="polite" className="sr-only">
        {politeAnnouncement}
      </span>

      {/* Editor Header Bar (Part I §12.5 / Part III §18) */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/contribute"
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink hover:border-brand"
          >
            ← Wizard
          </Link>
          <span className="font-mono text-xs text-ink-secondary" dir="ltr">
            Draft: {initialDraftId}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2.5 py-1 font-mono text-xs text-ink">
            {saveState === 'offline' && <CloudOff className="h-3.5 w-3.5 text-brand" aria-hidden="true" />}
            State: {saveState}
          </span>
          <span
            data-testid="pending-mutations-count"
            className="inline-flex items-center rounded-full bg-surface-subtle px-2.5 py-1 font-mono text-xs text-ink-secondary"
          >
            Pending sync: {pendingMutations}
          </span>
          {(pendingMutations > 0 || saveState === 'offline' || saveState === 'failed') && (
            <button
              type="button"
              onClick={() =>
                void coordinatorRef.current?.flush(initialDraftId).then(() => refreshPendingCount())
              }
              className="inline-flex min-h-11 items-center rounded-md border border-brand bg-brand/10 px-3 py-2 text-xs font-medium text-brand hover:bg-brand/15"
            >
              Retry sync
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            aria-label="Undo last document change"
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink hover:border-brand disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            aria-label="Redo document change"
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink hover:border-brand disabled:opacity-40"
          >
            <Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
            Redo
          </button>
          {/* Desktop pane toggles */}
          <button
            type="button"
            onClick={() => setSourcesOpen((v) => !v)}
            className="hidden min-h-11 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink hover:border-brand lg:inline-flex"
            aria-pressed={sourcesOpen}
          >
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
            Sources
          </button>
          <button
            type="button"
            onClick={() => setInspectorOpen((v) => !v)}
            className="hidden min-h-11 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink hover:border-brand lg:inline-flex"
            aria-pressed={inspectorOpen}
          >
            <PanelRight className="h-4 w-4" aria-hidden="true" />
            Inspector
          </button>

          {/* Mobile bottom-sheet triggers */}
          <button
            type="button"
            onClick={() => setMobileSheet('sources')}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink lg:hidden"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Sources
          </button>
          <button
            type="button"
            onClick={() => setMobileSheet('review')}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink lg:hidden"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Review ({blockers.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileSheet('assistant')}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink lg:hidden"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            AI
          </button>
          <button
            type="button"
            onClick={() => setMobileSheet('history')}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink lg:hidden"
          >
            <History className="h-4 w-4" aria-hidden="true" />
            History
          </button>
        </div>
      </header>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-line bg-surface px-4 py-2 text-xs text-ink"
        >
          {statusMessage}
        </div>
      )}

      {/* 409 Conflict Side-by-Side Resolution Panel (§11.7) */}
      {conflict && (
        <section
          aria-label="Draft version conflict resolution"
          className="rounded-xl border border-brand bg-surface p-4 space-y-3"
        >
          <h2 className="font-serif text-base font-bold text-ink">
            Version Conflict Detected (Server v{conflict.serverVersion})
          </h2>
          <p className="text-xs text-ink-secondary">
            Both your local draft and the newer server version have been preserved in a conflict
            snapshot. Choose how to reconcile:
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-line bg-canvas p-3 text-xs">
              <p className="font-semibold text-ink">Your Local Draft ({conflict.clientDocument.blocks.length} blocks)</p>
              <p className="mt-1 text-ink-secondary">{conflict.clientDocument.title || 'Untitled'}</p>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3 text-xs">
              <p className="font-semibold text-ink">Server Version v{conflict.serverVersion} ({conflict.serverDocument.blocks.length} blocks)</p>
              <p className="mt-1 text-ink-secondary">{conflict.serverDocument.title || 'Untitled'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => resolveConflict('merge-both')}
              className="min-h-11 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-primary"
            >
              Merge Both Versions
            </button>
            <button
              type="button"
              onClick={() => resolveConflict('keep-local')}
              className="min-h-11 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink"
            >
              Keep Local Draft
            </button>
            <button
              type="button"
              onClick={() => resolveConflict('accept-server')}
              className="min-h-11 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink"
            >
              Accept Server Version
            </button>
          </div>
        </section>
      )}

      {/* Multi-pane Responsive Workspace Grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        {sourcesOpen && (
          <aside
            aria-label="Sources pane"
            className="hidden rounded-xl border border-line bg-surface p-4 lg:col-span-3 lg:block"
          >
            <h2 className="mb-3 font-serif text-sm font-bold text-ink">Sources & Identifiers</h2>
            {sourcesPaneContent}
          </aside>
        )}

        {/* Primary Draft Canvas */}
        <section
          aria-label="Scholarly MDX draft canvas"
          className={`rounded-xl border border-line bg-surface p-4 sm:p-6 space-y-4 ${
            sourcesOpen && inspectorOpen
              ? 'lg:col-span-6'
              : sourcesOpen || inspectorOpen
                ? 'lg:col-span-9'
                : 'lg:col-span-12'
          }`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="editor-contrib-type" className="block text-xs font-semibold text-ink">
                Contribution Type
              </label>
              <select
                id="editor-contrib-type"
                value={contributionType}
                onChange={(e) => setContributionType(e.target.value as ContributionType)}
                className="mt-1 min-h-11 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink"
              >
                {(Object.keys(CONTRIBUTION_TYPE_CATALOG) as ContributionType[]).map((key) => (
                  <option key={key} value={key}>
                    {CONTRIBUTION_TYPE_CATALOG[key].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('canvas')}
                className={`min-h-11 rounded-lg border px-3.5 py-2 text-xs font-medium ${
                  activeTab === 'canvas'
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-line bg-canvas text-ink-secondary'
                }`}
              >
                Structured Blocks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mdx')}
                className={`inline-flex min-h-11 items-center gap-1 rounded-lg border px-3.5 py-2 text-xs font-medium ${
                  activeTab === 'mdx'
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-line bg-canvas text-ink-secondary'
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                Safe MDX Preview
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="editor-doc-title" className="block text-xs font-semibold text-ink">
              Contribution Title
            </label>
            <input
              id="editor-doc-title"
              type="text"
              value={doc.title}
              onChange={(e) => updateDoc((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Clear, verifiable scholarly title (supports multilingual and RTL scripts)…"
              className="mt-1 min-h-11 w-full rounded-lg border border-line bg-canvas px-3 py-2.5 font-serif text-lg font-semibold text-ink"
            />
          </div>

          <div>
            <label htmlFor="editor-doc-summary" className="block text-xs font-semibold text-ink">
              Executive Summary
            </label>
            <textarea
              id="editor-doc-summary"
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Concise summary of findings, scope, and principal limitation…"
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
            />
          </div>

          {activeTab === 'canvas' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink-secondary">
                  Drag blocks, use <kbd className="rounded border border-line px-1 font-mono">Alt+↑/↓</kbd>, or tap Up/Down to reorder. Type <kbd className="rounded border border-line px-1 font-mono">/</kbd> in an empty block for Slash Commands.
                </p>
                <button
                  type="button"
                  onClick={() => setSlashOpen((v) => !v)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs font-semibold text-ink hover:border-brand"
                >
                  <Plus className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  / Insert Block
                </button>
              </div>

              {slashOpen && (
                <div
                  role="menu"
                  aria-label="Slash command block menu"
                  className="rounded-xl bg-surface-subtle/60 p-3 space-y-2"
                >
                  <input
                    type="search"
                    aria-label="Filter slash command blocks"
                    value={slashFilter}
                    onChange={(e) => setSlashFilter(e.target.value)}
                    placeholder="Filter block type (evidence, claim, citation, limitation, code…)"
                    className="min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
                  />
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    {filteredSlashItems.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        role="menuitem"
                        onClick={() => addBlock(item.type)}
                        className="min-h-11 rounded-lg border border-line bg-surface p-2 text-left hover:border-brand"
                      >
                        <span className="block text-xs font-semibold text-ink">{item.label}</span>
                        <span className="block text-xs text-ink-secondary">{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ol className="space-y-3">
                {doc.blocks.map((block, index) => (
                  <li
                    key={block.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null && dragIndex !== index) {
                        moveBlock(dragIndex, index);
                      }
                      setDragIndex(null);
                    }}
                    className="rounded-xl bg-surface-subtle/60 p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GripVertical
                          className="h-4 w-4 text-ink-secondary cursor-grab"
                          aria-hidden="true"
                        />
                        <select
                          aria-label={`Block ${index + 1} type`}
                          value={block.type}
                          onChange={(e) =>
                            updateBlock(block.id, { type: e.target.value as ResearchBlockType })
                          }
                          className="min-h-11 rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-xs text-ink"
                        >
                          {BLOCK_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Move block ${index + 1} up`}
                          disabled={index === 0}
                          onClick={() => moveBlock(index, index - 1)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line bg-surface text-ink disabled:opacity-40"
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move block ${index + 1} down`}
                          disabled={index === doc.blocks.length - 1}
                          onClick={() => moveBlock(index, index + 1)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line bg-surface text-ink disabled:opacity-40"
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove block ${index + 1}`}
                          disabled={doc.blocks.length <= 1}
                          onClick={() => removeBlock(block.id)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line bg-surface text-ink disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {(block.type === 'evidence' || block.type === 'citation') && (
                      <input
                        type="text"
                        aria-label={`Block ${index + 1} source locator`}
                        value={block.locator ?? ''}
                        onChange={(e) => updateBlock(block.id, { locator: e.target.value })}
                        placeholder="Structured locator (e.g., Table 2, p. 14, Section 3.1)…"
                        className="min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-ink"
                      />
                    )}

                    {block.type === 'tool_review' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="url"
                          dir="ltr"
                          aria-label={`Block ${index + 1} repository URL`}
                          value={block.repoUrl ?? ''}
                          onChange={(e) => updateBlock(block.id, { repoUrl: e.target.value })}
                          placeholder="https://github.com/org/repo"
                          className="min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-ink"
                        />
                        <input
                          type="text"
                          dir="ltr"
                          aria-label={`Block ${index + 1} SPDX license`}
                          value={block.licenseSpdx ?? ''}
                          onChange={(e) => updateBlock(block.id, { licenseSpdx: e.target.value })}
                          placeholder="SPDX license (e.g., Apache-2.0, MIT)"
                          className="min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-ink"
                        />
                      </div>
                    )}

                    <textarea
                      aria-label={`Block ${index + 1} content`}
                      dir={
                        block.type === 'code' ||
                        block.type === 'equation' ||
                        block.type === 'diagram' ||
                        block.type === 'table'
                          ? 'ltr'
                          : undefined
                      }
                      rows={block.type === 'heading' ? 1 : block.type === 'table' || block.type === 'diagram' ? 4 : 3}
                      value={block.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '/') {
                          setSlashOpen(true);
                          setSlashFilter('');
                        }
                        updateBlock(block.id, { text: val });
                      }}
                      onKeyDown={(e) => {
                        if (e.altKey && e.key === 'ArrowUp') {
                          e.preventDefault();
                          moveBlock(index, index - 1);
                        } else if (e.altKey && e.key === 'ArrowDown') {
                          e.preventDefault();
                          moveBlock(index, index + 1);
                        }
                      }}
                      placeholder={`Enter ${block.type.replace(/_/g, ' ')} content…`}
                      className={`w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink ${
                        block.type === 'code' ||
                        block.type === 'equation' ||
                        block.type === 'diagram' ||
                        block.type === 'table'
                          ? 'font-mono text-xs'
                          : ''
                      }`}
                    />
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink-secondary">
                Deterministic, allowlisted MDX output:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-surface-subtle/60 p-4 font-mono text-xs text-ink">
                {mdxValidation.sanitizedMdx}
              </pre>
            </div>
          )}
        </section>

        {/* Desktop Right Inspector Pane (Review / Contextual Assistant / Snapshot History) */}
        {inspectorOpen && (
          <aside
            aria-label="Review, Assistant, and History inspector"
            className="hidden rounded-xl border border-line bg-surface p-4 lg:col-span-3 lg:block space-y-4"
          >
            <div role="tablist" aria-label="Inspector panes" className="grid grid-cols-3 gap-1">
              {(
                [
                  ['review', 'Review'],
                  ['assistant', 'Assistant'],
                  ['history', 'History'],
                ] as const
              ).map(([tabKey, label]) => (
                <button
                  key={tabKey}
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === tabKey}
                  onClick={() => setInspectorTab(tabKey)}
                  className={`min-h-11 rounded-md border px-2 py-2 text-xs font-medium ${
                    inspectorTab === tabKey
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-line bg-canvas text-ink-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {inspectorTab === 'review' && reviewPaneContent}
            {inspectorTab === 'assistant' && assistantPaneContent}
            {inspectorTab === 'history' && historyPaneContent}
          </aside>
        )}
      </div>

      {/* Mobile Accessible Bottom Sheets (Part II §6 / Part III §21) */}
      <BottomSheet
        open={mobileSheet === 'sources'}
        onClose={() => setMobileSheet(null)}
        title="Sources & Identifiers"
      >
        {sourcesPaneContent}
      </BottomSheet>
      <BottomSheet
        open={mobileSheet === 'review'}
        onClose={() => setMobileSheet(null)}
        title="Review & Publication Preconditions"
      >
        {reviewPaneContent}
      </BottomSheet>
      <BottomSheet
        open={mobileSheet === 'assistant'}
        onClose={() => setMobileSheet(null)}
        title="Contextual Assistant"
      >
        {assistantPaneContent}
      </BottomSheet>
      <BottomSheet
        open={mobileSheet === 'history'}
        onClose={() => setMobileSheet(null)}
        title="Draft Snapshots"
      >
        {historyPaneContent}
      </BottomSheet>
    </div>
  );
}
