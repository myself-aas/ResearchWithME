/**
 * ResearchWithME v3.4 — Part VII §4 Dual-Read Cutover & Fallback Telemetry Engine
 *
 * Implements the exact cutover rule from Part VII §4 & Part VIII §G:
 *   1. Prefer normalized v3.4 tables (`ClaimEvidence`, `ContributionEvidence`, `ContributionClaim`).
 *   2. Fall back to legacy rows only when normalized rows are absent.
 *   3. Emit zero-PII structured telemetry for every fallback (never logging titles, bodies, or reviewer IDs).
 *   4. Permit legacy table contraction only after 14 consecutive zero-fallback days and zero unexplained dual-write mismatches.
 */

export interface DualReadTelemetrySnapshot {
  normalizedHits: number;
  legacyFallbacks: number;
  dualWriteMismatches: number;
  lastFallbackAt: string | null;
  consecutiveZeroFallbackDays: number;
  readyForLegacyContract: boolean;
}

interface DualReadState {
  normalizedHits: number;
  legacyFallbacks: number;
  dualWriteMismatches: number;
  lastFallbackAt: string | null;
  fallbackBucketsByRelation: Record<string, number>;
}

const g = globalThis as unknown as { __rwmV34DualRead?: DualReadState };

function getState(): DualReadState {
  if (!g.__rwmV34DualRead) {
    g.__rwmV34DualRead = {
      normalizedHits: 0,
      legacyFallbacks: 0,
      dualWriteMismatches: 0,
      lastFallbackAt: null,
      fallbackBucketsByRelation: {},
    };
  }
  return g.__rwmV34DualRead;
}

export function resetDualReadTelemetryForTesting(): void {
  g.__rwmV34DualRead = {
    normalizedHits: 0,
    legacyFallbacks: 0,
    dualWriteMismatches: 0,
    lastFallbackAt: null,
    fallbackBucketsByRelation: {},
  };
}

export async function executeDualRead<T>(input: {
  relationName: 'ClaimEvidence' | 'ContributionEvidence' | 'ContributionClaim' | 'WorkspaceTool';
  readNormalized: () => Promise<T[]>;
  readLegacy: () => Promise<T[]>;
  compareParity?: boolean;
}): Promise<{ rows: T[]; source: 'normalized' | 'legacy-fallback'; parityMatch: boolean }> {
  const state = getState();
  const normalized = await input.readNormalized();

  if (normalized.length > 0) {
    state.normalizedHits += 1;
    let parityMatch = true;
    if (input.compareParity) {
      const legacy = await input.readLegacy();
      if (legacy.length > 0 && legacy.length !== normalized.length) {
        parityMatch = false;
        state.dualWriteMismatches += 1;
      }
    }
    return { rows: normalized, source: 'normalized', parityMatch };
  }

  const legacy = await input.readLegacy();
  if (legacy.length > 0) {
    state.legacyFallbacks += 1;
    state.lastFallbackAt = new Date().toISOString();
    state.fallbackBucketsByRelation[input.relationName] =
      (state.fallbackBucketsByRelation[input.relationName] ?? 0) + 1;
    return { rows: legacy, source: 'legacy-fallback', parityMatch: false };
  }

  state.normalizedHits += 1;
  return { rows: [], source: 'normalized', parityMatch: true };
}

export function getDualReadTelemetrySnapshot(options?: {
  nowMs?: number;
  cutoverStartedAtIso?: string;
}): DualReadTelemetrySnapshot {
  const state = getState();
  const nowMs = options?.nowMs ?? Date.now();
  const anchorIso = state.lastFallbackAt ?? options?.cutoverStartedAtIso ?? new Date(nowMs).toISOString();
  const elapsedDays = Math.max(0, Math.floor((nowMs - Date.parse(anchorIso)) / (24 * 60 * 60 * 1000)));
  const consecutiveZeroFallbackDays = state.legacyFallbacks === 0 || state.lastFallbackAt ? elapsedDays : 0;

  return {
    normalizedHits: state.normalizedHits,
    legacyFallbacks: state.legacyFallbacks,
    dualWriteMismatches: state.dualWriteMismatches,
    lastFallbackAt: state.lastFallbackAt,
    consecutiveZeroFallbackDays,
    readyForLegacyContract:
      consecutiveZeroFallbackDays >= 14 && state.dualWriteMismatches === 0,
  };
}
