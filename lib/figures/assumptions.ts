/**
 * Pure logic for the AssumptionSwitches figure (archetype:
 * toggle-assumption-inference). Outcomes are base values plus per-assumption
 * deltas — flipping a switch re-derives the conclusion from data only.
 */

export type Assumption = {
  id: string;
  label: string;
  note?: string;
}

export type AssumptionOutcome = {
  label: string;
  base: number;
  unit?: string;
  betterWhen: 'higher' | 'lower';
  /** Change applied while the assumption with this id is on. */
  deltas: Record<string, number>;
}

export function outcomeValue(outcome: AssumptionOutcome, active: ReadonlySet<string>): number {
  let value = outcome.base;
  for (const [id, delta] of Object.entries(outcome.deltas)) {
    if (active.has(id)) value += delta;
  }
  return value;
}

/**
 * Meter width (0–100) for an outcome: distance from the worst achievable
 * value to the current one, normalised against the full achievable span.
 * The span accounts for *combinations* — deltas add up, so the best value is
 * the base plus every positive delta (or negative, for lower-is-better).
 */
export function meterPercent(outcome: AssumptionOutcome, active: ReadonlySet<string>): number {
  const span = Object.values(outcome.deltas).reduce(
    (acc, delta) => {
      if (delta >= 0) acc.up += delta;
      else acc.down += delta;
      return acc;
    },
    { up: 0, down: 0 },
  );
  const top = outcome.base + span.up;
  const bottom = outcome.base + span.down;
  const worst = outcome.betterWhen === 'higher' ? bottom : top;
  const best = outcome.betterWhen === 'higher' ? top : bottom;
  const value = outcomeValue(outcome, active);
  if (best === worst) return 100;
  return Math.round(Math.min(Math.max(((value - worst) / (best - worst)) * 100, 0), 100));
}

/** One-line verdict: what changed between renders, for the aria-live region. */
export function verdict(outcomes: AssumptionOutcome[], active: ReadonlySet<string>): string {
  const parts = outcomes.map((outcome) => `${outcome.label} ${outcomeValue(outcome, active)}`);
  return parts.join(' · ');
}
