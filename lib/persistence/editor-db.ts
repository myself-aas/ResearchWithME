/**
 * Three-layer client persistence layer (v3.4 §11.1–11.2).
 *
 * Uses IndexedDB (`researchwithme-editor`, schema v2) in browsers with an
 * automatic in-memory fallback for SSR/jsdom environments where IndexedDB is
 * unavailable. Keeps the client shell lightweight (~2 KB vs external ORM).
 */
import type { ContributionType, ResearchDocument } from '@/lib/v34/contracts';

export type SaveState =
  | 'editing'
  | 'saving'
  | 'saved'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'failed';

export interface LocalDraftRecord {
  id: string;
  workspaceId: string;
  contributionType: ContributionType;
  title: string;
  document: ResearchDocument;
  localVersion: number;
  remoteVersion: number;
  saveState: SaveState;
  lastModifiedAt: string;
  lastSyncedAt?: string;
}

export interface PendingMutation {
  mutationId: string;
  draftId: string;
  baseVersion: number;
  contributionType: ContributionType;
  title: string;
  createdAt: string;
  payload: ResearchDocument;
  attemptCount: number;
  nextAttemptAt?: string;
}

export interface LocalDraftSnapshot {
  id: string;
  draftId: string;
  version: number;
  document: ResearchDocument;
  createdAt: string;
  reason: 'interval' | 'manual' | 'pre-publish' | 'conflict';
}

const DB_NAME = 'researchwithme-editor';
const DB_VERSION = 2;

const STORES = {
  drafts: 'drafts',
  mutations: 'mutations',
  snapshots: 'snapshots',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

function hasIndexedDb(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.indexedDB !== 'undefined';
}

export class EditorDatabase {
  private memDrafts = new Map<string, LocalDraftRecord>();
  private memMutations = new Map<string, PendingMutation>();
  private memSnapshots = new Map<string, LocalDraftSnapshot>();
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.drafts)) {
          const drafts = db.createObjectStore(STORES.drafts, { keyPath: 'id' });
          drafts.createIndex('lastModifiedAt', 'lastModifiedAt');
        }
        if (!db.objectStoreNames.contains(STORES.mutations)) {
          const mutations = db.createObjectStore(STORES.mutations, { keyPath: 'mutationId' });
          mutations.createIndex('draftId', 'draftId');
          mutations.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains(STORES.snapshots)) {
          const snapshots = db.createObjectStore(STORES.snapshots, { keyPath: 'id' });
          snapshots.createIndex('draftId', 'draftId');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  private async runTx<T>(
    storeName: StoreName,
    mode: IDBTransactionMode,
    op: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = op(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error(`IndexedDB ${storeName} error`));
    });
  }

  async putDraft(record: LocalDraftRecord): Promise<void> {
    if (!hasIndexedDb()) {
      this.memDrafts.set(record.id, record);
      return;
    }
    try {
      await this.runTx(STORES.drafts, 'readwrite', (s) => s.put(record));
    } catch {
      this.memDrafts.set(record.id, record);
    }
  }

  async getDraft(id: string): Promise<LocalDraftRecord | undefined> {
    if (!hasIndexedDb()) return this.memDrafts.get(id);
    try {
      return await this.runTx<LocalDraftRecord | undefined>(STORES.drafts, 'readonly', (s) => s.get(id));
    } catch {
      return this.memDrafts.get(id);
    }
  }

  async listDrafts(): Promise<LocalDraftRecord[]> {
    if (!hasIndexedDb()) {
      return [...this.memDrafts.values()].sort((a, b) => b.lastModifiedAt.localeCompare(a.lastModifiedAt));
    }
    try {
      const all = await this.runTx<LocalDraftRecord[]>(STORES.drafts, 'readonly', (s) => s.getAll());
      return all.sort((a, b) => b.lastModifiedAt.localeCompare(a.lastModifiedAt));
    } catch {
      return [...this.memDrafts.values()].sort((a, b) => b.lastModifiedAt.localeCompare(a.lastModifiedAt));
    }
  }

  async deleteDraft(id: string): Promise<void> {
    this.memDrafts.delete(id);
    if (!hasIndexedDb()) return;
    try {
      await this.runTx(STORES.drafts, 'readwrite', (s) => s.delete(id));
    } catch {
      // ignore fallback delete errors
    }
  }

  async putMutation(mutation: PendingMutation): Promise<void> {
    if (!hasIndexedDb()) {
      this.memMutations.set(mutation.mutationId, mutation);
      return;
    }
    try {
      await this.runTx(STORES.mutations, 'readwrite', (s) => s.put(mutation));
    } catch {
      this.memMutations.set(mutation.mutationId, mutation);
    }
  }

  async getMutationsForDraft(draftId: string): Promise<PendingMutation[]> {
    if (!hasIndexedDb()) {
      return [...this.memMutations.values()]
        .filter((m) => m.draftId === draftId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    try {
      const all = await this.runTx<PendingMutation[]>(STORES.mutations, 'readonly', (s) => s.getAll());
      return all
        .filter((m) => m.draftId === draftId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch {
      return [...this.memMutations.values()]
        .filter((m) => m.draftId === draftId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
  }

  async deleteMutation(mutationId: string): Promise<void> {
    this.memMutations.delete(mutationId);
    if (!hasIndexedDb()) return;
    try {
      await this.runTx(STORES.mutations, 'readwrite', (s) => s.delete(mutationId));
    } catch {
      // ignore
    }
  }

  async putSnapshot(snapshot: LocalDraftSnapshot): Promise<void> {
    if (!hasIndexedDb()) {
      this.memSnapshots.set(snapshot.id, snapshot);
      return;
    }
    try {
      await this.runTx(STORES.snapshots, 'readwrite', (s) => s.put(snapshot));
    } catch {
      this.memSnapshots.set(snapshot.id, snapshot);
    }
  }

  async listSnapshotsForDraft(draftId: string): Promise<LocalDraftSnapshot[]> {
    if (!hasIndexedDb()) {
      return [...this.memSnapshots.values()]
        .filter((s) => s.draftId === draftId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    try {
      const all = await this.runTx<LocalDraftSnapshot[]>(STORES.snapshots, 'readonly', (s) => s.getAll());
      return all
        .filter((s) => s.draftId === draftId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [...this.memSnapshots.values()]
        .filter((s) => s.draftId === draftId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }

  async clearAll(): Promise<void> {
    this.memDrafts.clear();
    this.memMutations.clear();
    this.memSnapshots.clear();
    if (!hasIndexedDb()) return;
    try {
      await this.runTx(STORES.drafts, 'readwrite', (s) => s.clear());
      await this.runTx(STORES.mutations, 'readwrite', (s) => s.clear());
      await this.runTx(STORES.snapshots, 'readwrite', (s) => s.clear());
    } catch {
      // Best-effort clear when IndexedDB is unavailable
    }
  }

  clearMemoryForTesting(): void {
    this.memDrafts.clear();
    this.memMutations.clear();
    this.memSnapshots.clear();
  }
}

export const editorDb = new EditorDatabase();
