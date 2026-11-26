/**
 * Pure logic for the BudgetSplit figure (archetype: partition-drag-allocation).
 * A fixed budget (100 shares) is partitioned across buckets by dragging the
 * dividers between them; buckets may carry real caps. Pure math only.
 */

export type BudgetBucket = {
  id: string;
  label: string;
  /** Real cap in `unit`s, when one exists (0 = uncapped). */
  max?: number;
  unit?: string;
}

export type BudgetTotals = {
  /** What the whole bar represents, e.g. { value: 1024, unit: 'KB' }. */
  value: number;
  unit: string;
}

/** Validate/normalize an allocation to non-negative shares summing to 100. */
export function normalizeShares(shares: number[]): number[] {
  const clamped = shares.map((share) => (Number.isFinite(share) && share > 0 ? share : 0));
  const sum = clamped.reduce((total, share) => total + share, 0);
  if (sum <= 0) return clamped.map(() => 100 / Math.max(clamped.length, 1));
  return clamped.map((share) => (share / sum) * 100);
}

/**
 * Drag divider `index` (between bucket index and index+1) by `delta` shares,
 * respecting each bucket's cap. Returns the adjusted share list.
 */
export function moveDivider(shares: number[], index: number, delta: number, buckets: BudgetBucket[]): number[] {
  if (index < 0 || index >= shares.length - 1) return shares;
  const next = [...shares];
  const left = next[index];
  const right = next[index + 1];
  const room = delta > 0 ? right : left;
  const applied = Math.sign(delta) * Math.min(Math.abs(delta), Math.max(room, 0));
  const newLeft = left + applied;
  const newRight = right - applied;
  const leftCap = buckets[index]?.max ?? 0;
  const rightCap = buckets[index + 1]?.max ?? 0;
  const total = shares.reduce((sum, share) => sum + share, 0);
  next[index] = Math.min(Math.max(newLeft, 0), leftCap > 0 ? (leftCap / total) * 100 : 100);
  next[index + 1] = Math.min(Math.max(newRight, 0), rightCap > 0 ? (rightCap / total) * 100 : 100);
  // Caps can clamp the pair off the total; renormalize so the bar stays full.
  return normalizeShares(next);
}

/** Share of the total budget in real units for one bucket. */
export function bucketValue(bucket: BudgetBucket, share: number, totals: BudgetTotals): number {
  const raw = (share / 100) * totals.value;
  return bucket.max && bucket.max > 0 ? Math.min(raw, bucket.max) : raw;
}
