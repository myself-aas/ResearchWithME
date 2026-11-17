/**
 * Draft Sync Coordinator (v3.4 §11.3–11.7).
 *
 * Guarantees:
 * - Local IndexedDB write happens immediately after debounce before any network call.
 * - Strictly ONE flush loop runs per draft at a time.
 * - Unsent mutations for the same draft are safely coalesced to the newest payload.
 * - Older server responses never downgrade `remoteVersion`.
 * - 409 conflicts capture a local conflict snapshot and preserve BOTH versions.
 * - Transient network failures retry with bounded exponential backoff + jitter.
 */
import type { ContributionType, ResearchDocument } from '@/lib/v34/contracts';
import {
  editorDb,
  type EditorDatabase,
  type LocalDraftRecord,
  type PendingMutation,
  type SaveState,
} from './editor-db';

export interface ConflictDetail {
  draftId: string;
  serverVersion: number;
  serverDocument: ResearchDocument;
  clientDocument: ResearchDocument;
}

export type SubmitMutationResult =
  | { status: 'ok'; version: number; updatedAt: string }
  | { status: 'conflict'; serverVersion: number; serverDocument: ResearchDocument }
  | { status: 'auth-required' }
  | { status: 'retryable-error'; message: string };

export type MutationTransport = (mutation: PendingMutation) => Promise<SubmitMutationResult>;

/** Exponential backoff with bounded jitter (§11.5). */
export function retryDelayMs(attempt: number, random = Math.random): number {
  const base = Math.min(30_000, 500 * 2 ** Math.max(0, attempt));
  const jitter = Math.floor(random() * 250);
  return base + jitter;
}

function makeMutationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `mut-${crypto.randomUUID()}`;
  }
  return `mut-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const defaultAutosaveTransport: MutationTransport = async (mutation) => {
  try {
    const response = await fetch(`/api/drafts/${encodeURIComponent(mutation.draftId)}/autosave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mutationId: mutation.mutationId,
        baseVersion: mutation.baseVersion,
        contributionType: mutation.contributionType,
        title: mutation.title,
        document: mutation.payload,
        reason: 'interval',
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return { status: 'auth-required' };
    }
    if (response.status === 409) {
      const data = (await response.json()) as {
        conflict?: { serverVersion: number; serverDocument: ResearchDocument };
      };
      if (data.conflict) {
        return {
          status: 'conflict',
          serverVersion: data.conflict.serverVersion,
          serverDocument: data.conflict.serverDocument,
        };
      }
      return { status: 'retryable-error', message: 'Draft conflict detected.' };
    }
    if (!response.ok) {
      return { status: 'retryable-error', message: `Autosave returned ${response.status}` };
    }
    const body = (await response.json()) as { draft: { version: number; updatedAt: string } };
    return {
      status: 'ok',
      version: body.draft.version,
      updatedAt: body.draft.updatedAt,
    };
  } catch (error) {
    return {
      status: 'retryable-error',
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
};

export interface DraftSyncCoordinatorOptions {
  db?: EditorDatabase;
  transport?: MutationTransport;
  isOnline?: () => boolean;
  onStateChange?: (state: SaveState, draft: LocalDraftRecord) => void;
  onConflict?: (conflict: ConflictDetail) => void;
}

export class DraftSyncCoordinator {
  private readonly db: EditorDatabase;
  private readonly transport: MutationTransport;
  private readonly isOnline: () => boolean;
  private readonly onStateChange?: (state: SaveState, draft: LocalDraftRecord) => void;
  private readonly onConflict?: (conflict: ConflictDetail) => void;
  private readonly activeFlushes = new Map<string, Promise<void>>();

  constructor(options: DraftSyncCoordinatorOptions = {}) {
    this.db = options.db ?? editorDb;
    this.transport = options.transport ?? defaultAutosaveTransport;
    this.isOnline =
      options.isOnline ??
      (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    this.onStateChange = options.onStateChange;
    this.onConflict = options.onConflict;
  }

  /**
   * Layer 1 -> Layer 2 local save + enqueue coalesced mutation for Layer 3 sync.
   */
  async saveLocallyAndEnqueue(input: {
    draftId: string;
    workspaceId?: string;
    contributionType: ContributionType;
    title: string;
    document: ResearchDocument;
  }): Promise<LocalDraftRecord> {
    const existing = await this.db.getDraft(input.draftId);
    const now = new Date().toISOString();
    const localVersion = (existing?.localVersion ?? 0) + 1;
    const remoteVersion = existing?.remoteVersion ?? 0;

    const record: LocalDraftRecord = {
      id: input.draftId,
      workspaceId: input.workspaceId ?? existing?.workspaceId ?? 'personal',
      contributionType: input.contributionType,
      title: input.title,
      document: { ...input.document, updatedAt: now },
      localVersion,
      remoteVersion,
      saveState: this.isOnline() ? 'saved' : 'offline',
      lastModifiedAt: now,
      lastSyncedAt: existing?.lastSyncedAt,
    };
    await this.db.putDraft(record);
    this.onStateChange?.(record.saveState, record);

    // Coalesce any unsent mutations for this draft so we only send the latest document.
    const queued = await this.db.getMutationsForDraft(input.draftId);
    for (const stale of queued) {
      await this.db.deleteMutation(stale.mutationId);
    }

    const mutation: PendingMutation = {
      mutationId: makeMutationId(),
      draftId: input.draftId,
      baseVersion: remoteVersion,
      contributionType: input.contributionType,
      title: input.title,
      createdAt: now,
      payload: record.document,
      attemptCount: 0,
    };
    await this.db.putMutation(mutation);

    if (this.isOnline()) {
      void this.flush(input.draftId);
    } else {
      void this.requestBackgroundSync();
    }

    return record;
  }

  /**
   * Registers the `rwm-editor-autosave-sync` Service Worker Background Sync tag
   * when mutations are queued offline (Wave 18 P1).
   */
  private async requestBackgroundSync(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      await reg.sync?.register('rwm-editor-autosave-sync');
    } catch {
      // Fallback to foreground/online sync handled by PwaLifecycleBridge
    }
  }

  /**
   * Strictly one flush loop per draft (§11.3–11.4).
   */
  async flush(draftId: string): Promise<void> {
    const running = this.activeFlushes.get(draftId);
    if (running) return running;

    const loop = (async () => {
      try {
        while (this.isOnline()) {
          const mutations = await this.db.getMutationsForDraft(draftId);
          const next = mutations[0];
          if (!next) break;

          const currentDraft = await this.db.getDraft(draftId);
          if (!currentDraft) {
            await this.db.deleteMutation(next.mutationId);
            break;
          }

          // Always use the latest known remoteVersion so a newer mutation never sends a stale baseVersion.
          const effectiveMutation: PendingMutation = {
            ...next,
            baseVersion: Math.max(next.baseVersion, currentDraft.remoteVersion),
          };

          const savingDraft: LocalDraftRecord = { ...currentDraft, saveState: 'saving' };
          await this.db.putDraft(savingDraft);
          this.onStateChange?.('saving', savingDraft);

          const result = await this.transport(effectiveMutation);

          if (result.status === 'ok') {
            await this.db.deleteMutation(next.mutationId);
            const refreshed = (await this.db.getDraft(draftId)) ?? savingDraft;
            // Never let an older response downgrade remoteVersion.
            const nextRemote = Math.max(refreshed.remoteVersion, result.version);
            const remaining = await this.db.getMutationsForDraft(draftId);
            const syncedDraft: LocalDraftRecord = {
              ...refreshed,
              remoteVersion: nextRemote,
              saveState: remaining.length === 0 ? 'synced' : 'saving',
              lastSyncedAt: result.updatedAt,
            };
            await this.db.putDraft(syncedDraft);
            this.onStateChange?.(syncedDraft.saveState, syncedDraft);
            continue;
          }

          if (result.status === 'auth-required') {
            // Anonymous user: keep safe in local IndexedDB (`saved`), stop trying remote sync.
            await this.db.deleteMutation(next.mutationId);
            const localOnly: LocalDraftRecord = { ...currentDraft, saveState: 'saved' };
            await this.db.putDraft(localOnly);
            this.onStateChange?.('saved', localOnly);
            break;
          }

          if (result.status === 'conflict') {
            // Capture conflict snapshot before surfacing conflict UI (§11.3 & §11.7).
            await this.db.putSnapshot({
              id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              draftId,
              version: currentDraft.localVersion,
              document: currentDraft.document,
              createdAt: new Date().toISOString(),
              reason: 'conflict',
            });
            await this.db.deleteMutation(next.mutationId);
            const conflicted: LocalDraftRecord = {
              ...currentDraft,
              remoteVersion: Math.max(currentDraft.remoteVersion, result.serverVersion),
              saveState: 'conflict',
            };
            await this.db.putDraft(conflicted);
            this.onStateChange?.('conflict', conflicted);
            this.onConflict?.({
              draftId,
              serverVersion: result.serverVersion,
              serverDocument: result.serverDocument,
              clientDocument: currentDraft.document,
            });
            break;
          }

          // Retryable error: bump attemptCount & nextAttemptAt, preserve local draft safely.
          const attempt = next.attemptCount + 1;
          await this.db.putMutation({
            ...next,
            attemptCount: attempt,
            nextAttemptAt: new Date(Date.now() + retryDelayMs(attempt)).toISOString(),
          });
          const failedDraft: LocalDraftRecord = {
            ...currentDraft,
            saveState: this.isOnline() ? 'failed' : 'offline',
          };
          await this.db.putDraft(failedDraft);
          this.onStateChange?.(failedDraft.saveState, failedDraft);
          break;
        }
      } finally {
        this.activeFlushes.delete(draftId);
      }
    })();

    this.activeFlushes.set(draftId, loop);
    return loop;
  }
}
