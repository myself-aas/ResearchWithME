/**
 * Pure logic for the WipeCompare figure (archetype: drag-wipe-comparison).
 * No React here — the constitution requires figure math to be testable.
 */

export type WipeLayer = {
  label: string;
  values: number[][];
  tone: 'brand' | 'emerging' | 'insight' | 'ink';
}

/** Keep the reveal boundary inside the panel; 50 shows both halves equally. */
export function clampSplit(split: number): number {
  if (!Number.isFinite(split)) return 50;
  return Math.min(Math.max(Math.round(split), 0), 100);
}

/** Row maxima for tone mapping, computed once per render pass. */
export function gridMax(values: number[][]): number {
  return values.reduce(
    (max, row) => Math.max(max, row.reduce((rowMax, cell) => Math.max(rowMax, cell), 0)),
    0,
  );
}
