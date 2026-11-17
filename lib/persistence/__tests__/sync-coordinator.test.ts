import { beforeEach, describe, expect, it } from 'vitest';
import { EditorDatabase, type SaveState } from '@/lib/persistence/editor-db';
import {
  DraftSyncCoordinator,
  retryDelayMs,
  type ConflictDetail,
  type SubmitMutationResult,
} from '@/lib/persistence/sync-coordinator';
import type { ResearchDocument } from '@/lib/v34/contracts';

function makeDoc(id: string, text: string): ResearchDocument {
  return {
    schemaVersion: '1.0',
    id,
    title: 'Draft title',
    authorId: 'u1',
    workspaceId: 'w1',
    version: 1,
    createdAt: '2026-11-16T00:00:00.000Z',
    updatedAt: '2026-11-16T00:00:00.000Z',
    blocks: [{ id: 'b1', type: 'paragraph', text }],
  };
}

describe('DraftSyncCoordinator (v3.4 §11)', () => {
  let db: EditorDatabase;

  beforeEach(() => {
    db = new EditorDatabase();
    db.clearMemoryForTesting();
  });

  it('persists locally offline and flushes cleanly once reconnected', async () => {
    let online = false;
    let calls = 0;
    const states: SaveState[] = [];

    const coordinator = new DraftSyncCoordinator({
      db,
      isOnline: () => online,
      onStateChange: (state) => states.push(state),
      transport: async () => {
        calls += 1;
        return { status: 'ok', version: 1, updatedAt: '2026-11-16T12:01:00.000Z' };
      },
    });

    await coordinator.saveLocallyAndEnqueue({
      draftId: 'draft-offline',
      contributionType: 'paper-review',
      title: 'Offline Review',
      document: makeDoc('draft-offline', 'Written on a train'),
    });

    expect(calls).toBe(0);
    const saved = await db.getDraft('draft-offline');
    expect(saved?.saveState).toBe('offline');
    expect(saved?.document.blocks[0].text).toBe('Written on a train');

    // Reconnect and flush
    online = true;
    await coordinator.flush('draft-offline');

    expect(calls).toBe(1);
    const synced = await db.getDraft('draft-offline');
    expect(synced?.saveState).toBe('synced');
    expect(synced?.remoteVersion).toBe(1);
    expect(states).toContain('synced');
  });

  it('captures a local conflict snapshot and preserves both versions on 409 conflict', async () => {
    const conflicts: ConflictDetail[] = [];
    const serverDoc = makeDoc('draft-conflict', 'Server edit from tablet');

    const coordinator = new DraftSyncCoordinator({
      db,
      isOnline: () => true,
      onConflict: (detail) => conflicts.push(detail),
      transport: async (): Promise<SubmitMutationResult> => ({
        status: 'conflict',
        serverVersion: 3,
        serverDocument: serverDoc,
      }),
    });

    await coordinator.saveLocallyAndEnqueue({
      draftId: 'draft-conflict',
      contributionType: 'research-note',
      title: 'Conflicted Note',
      document: makeDoc('draft-conflict', 'Local edit from laptop'),
    });
    await coordinator.flush('draft-conflict');

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].serverVersion).toBe(3);
    expect(conflicts[0].clientDocument.blocks[0].text).toBe('Local edit from laptop');
    expect(conflicts[0].serverDocument.blocks[0].text).toBe('Server edit from tablet');

    const snapshots = await db.listSnapshotsForDraft('draft-conflict');
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].reason).toBe('conflict');
  });

  it('computes bounded exponential backoff with jitter', () => {
    expect(retryDelayMs(0, () => 0)).toBe(500);
    expect(retryDelayMs(1, () => 0)).toBe(1000);
    expect(retryDelayMs(2, () => 0.5)).toBe(2125);
    expect(retryDelayMs(20, () => 0)).toBe(30_000);
  });
});
