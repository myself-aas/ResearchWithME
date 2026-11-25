/**
 * Pure logic for the TradeoffPad figure (archetype: 2d-parameter-drag).
 * Outcomes are linear models over normalised axes — data, not functions, so
 * the whole pad is serialisable props and the math is unit-testable.
 */

export type TradeoffAxis = {
  label: string;
  /** Value shown at the low end of the axis (0 on the normalised scale). */
  low: number;
  /** Value shown at the high end of the axis (1 on the normalised scale). */
  high: number;
  unit?: string;
}

export type TradeoffOutput = {
  label: string;
  /** Outcome value when both axes sit at 0. */
  base: number;
  /** Change in the outcome when the x / y axis moves from 0 to 1. */
  xCoef: number;
  yCoef: number;
  unit?: string;
}

export type TradeoffBudget = {
  label: string;
  /** The budget ceiling, in the same units as the computed constraint. */
  max: number;
  xCoef: number;
  yCoef: number;
  base?: number;
}

export function clampNorm(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(Math.max(value, 0), 1);
}

export function axisValue(axis: TradeoffAxis, norm: number): number {
  const clamped = clampNorm(norm);
  return axis.low + (axis.high - axis.low) * clamped;
}

export function evaluateOutput(output: TradeoffOutput, xNorm: number, yNorm: number): number {
  const x = clampNorm(xNorm);
  const y = clampNorm(yNorm);
  return output.base + output.xCoef * x + output.yCoef * y;
}

/**
 * Feasibility grid for the budget shading: an n×n boolean field marking where
 * the constraint holds, rendered as a subtle wash behind the pad.
 */
export function feasibleGrid(budget: TradeoffBudget, n: number): boolean[][] {
  const base = budget.base ?? 0;
  const grid: boolean[][] = [];
  for (let row = 0; row < n; row += 1) {
    const y = 1 - row / Math.max(n - 1, 1); // row 0 is the top = y = 1
    const line: boolean[] = [];
    for (let col = 0; col < n; col += 1) {
      const x = col / Math.max(n - 1, 1);
      line.push(base + budget.xCoef * x + budget.yCoef * y <= budget.max);
    }
    grid.push(line);
  }
  return grid;
}

/** Format an axis-anchored readout without leaking floating-point noise. */
export function formatValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
