import { describe, expect, it } from 'vitest';
import { hashSeed, mulberry32 } from '@/lib/figures/random';
import { clampSplit, gridMax } from '@/lib/figures/wipe';
import { axisValue, clampNorm, evaluateOutput, feasibleGrid, formatValue } from '@/lib/figures/tradeoff';
import { clampTick, leaderIndex, ranks, tickCount, valueAt } from '@/lib/figures/race';
import { clampPosition, lensCells, valueUnder } from '@/lib/figures/lens';
import { meterPercent, outcomeValue, verdict } from '@/lib/figures/assumptions';
import { correctIndex, isAnswerCorrect, scoreOf } from '@/lib/figures/quiz';
import { shadeFor } from '@/lib/figures/tones';

/**
 * Unit tests for the figure library's pure logic (Constitution Article 8:
 * the math is data-side, tested, and deterministic).
 */

describe('random', () => {
  it('is seeded and reproducible', () => {
    const a = mulberry32(hashSeed('field'));
    const b = mulberry32(hashSeed('field'));
    for (let i = 0; i < 50; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('hashes different names to different seeds', () => {
    expect(hashSeed('march')).not.toBe(hashSeed('september'));
  });
});

describe('wipe', () => {
  it('clamps the split to [0, 100] and tolerates junk', () => {
    expect(clampSplit(50)).toBe(50);
    expect(clampSplit(-3)).toBe(0);
    expect(clampSplit(140)).toBe(100);
    expect(clampSplit(Number.NaN)).toBe(50);
  });

  it('finds the field maximum across rows', () => {
    expect(gridMax([[1, 2], [7, 3]])).toBe(7);
    expect(gridMax([[0, 0]])).toBe(0);
  });
});

describe('tones', () => {
  it('ramps from strongest at max to weakest at zero', () => {
    expect(shadeFor(10, 10, 'brand')).toBe(shadeFor(11, 10, 'brand'));
    expect(shadeFor(0, 10, 'brand')).toBe(shadeFor(-1, 10, 'brand'));
    expect(shadeFor(10, 10, 'brand')).not.toBe(shadeFor(0, 10, 'brand'));
  });

  it('degenerates gracefully on a zero max', () => {
    expect(shadeFor(4, 0, 'ink')).toBe(shadeFor(1, 0, 'ink'));
  });
});

describe('tradeoff', () => {
  it('maps normalised points onto axis ranges', () => {
    const axis = { label: 'Batch', low: 1, high: 64 };
    expect(axisValue(axis, 0)).toBe(1);
    expect(axisValue(axis, 1)).toBe(64);
    expect(axisValue(axis, 0.5)).toBeCloseTo(32.5);
    expect(axisValue(axis, clampNorm(9))).toBe(axisValue(axis, 1));
  });

  it('evaluates linear outcomes from data coefficients', () => {
    const output = { label: 'Throughput', base: 40, xCoef: 100, yCoef: -20 };
    expect(evaluateOutput(output, 0, 0)).toBe(40);
    expect(evaluateOutput(output, 1, 0)).toBe(140);
    expect(evaluateOutput(output, 1, 1)).toBe(120);
  });

  it('builds an n×n feasibility field with y inverted (row 0 = top)', () => {
    const grid = feasibleGrid({ label: 'Energy', max: 15, xCoef: 10, yCoef: 10, base: 0 }, 5);
    expect(grid).toHaveLength(5);
    expect(grid[0][0]).toBe(true); // top-left: x=0, y=1 → cost 10 ≤ 15
    expect(grid[0][4]).toBe(false); // top-right: x=1, y=1 → cost 20 > 15
    expect(grid[4][0]).toBe(true); // bottom-left: cost 0
    expect(grid.every((line) => line.length === 5)).toBe(true);
  });

  it('formats without float noise', () => {
    expect(formatValue(32.5)).toBe('32.5');
    expect(formatValue(64)).toBe('64');
    expect(formatValue(0.30000000000000004)).toBe('0.3');
  });
});

describe('race', () => {
  const series = [
    { label: 'A', points: [1, 2, 10], tone: 'brand' as const },
    { label: 'B', points: [2, 2, 9, 12], tone: 'emerging' as const },
    { label: 'C', points: [3], tone: 'insight' as const },
  ];

  it('derives the tick count from the longest series', () => {
    expect(tickCount(series)).toBe(4);
    expect(clampTick(99, 4)).toBe(3);
    expect(clampTick(-1, 4)).toBe(0);
  });

  it('holds a finished series at its final value', () => {
    expect(valueAt(series[0], 3)).toBe(10);
    expect(valueAt(series[2], 3)).toBe(3);
  });

  it('ranks with ties keeping registration order, and finds the leader', () => {
    expect(ranks([10, 10, 3])).toEqual([0, 0, 2]);
    expect(leaderIndex([10, 10, 3])).toBe(0);
    expect(leaderIndex([1, 9, 3])).toBe(1);
  });
});

describe('lens', () => {
  const grid = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  it('clamps positions into the grid', () => {
    expect(clampPosition({ col: -2, row: 99 }, 3, 3)).toEqual({ col: 0, row: 2 });
    expect(clampPosition({ col: Number.NaN, row: 1 }, 3, 3)).toEqual({ col: 0, row: 1 });
  });

  it('collects cells within the radius and inside the grid only', () => {
    const cells = lensCells({ col: 0, row: 0 }, 1, 3, 3);
    expect(cells).toEqual([[0, 0], [0, 1], [1, 0]]); // radius-1 circle, not a square: the corner diagonal is outside
    expect(lensCells({ col: 1, row: 1 }, 0, 3, 3)).toEqual([[1, 1]]);
  });

  it('reads the value under the centre, null-safe', () => {
    expect(valueUnder(grid, { col: 2, row: 1 })).toBe(6);
    expect(valueUnder(grid, { col: 9, row: 9 })).toBeNull();
  });
});

describe('assumptions', () => {
  const outcome = {
    label: 'Coverage',
    base: 50,
    betterWhen: 'higher' as const,
    deltas: { a: 10, b: 20, c: -5 },
  };

  it('sums the deltas of active assumptions only', () => {
    expect(outcomeValue(outcome, new Set(['a', 'b', 'c']))).toBe(75);
    expect(outcomeValue(outcome, new Set())).toBe(50);
    expect(outcomeValue(outcome, new Set(['c']))).toBe(45);
  });

  it('meters distance from the worst achievable value over the full span', () => {
    // Span over combinations: best = base + 10 + 20 = 80 ('c' subtracts, so
    // all-on is not optimal), worst = base − 5 = 45; total span 35.
    expect(meterPercent(outcome, new Set(['a', 'b', 'c']))).toBe(Math.round((30 / 35) * 100));
    expect(meterPercent(outcome, new Set(['a', 'b']))).toBe(100);
    expect(meterPercent(outcome, new Set(['c']))).toBe(0);
    expect(meterPercent(outcome, new Set())).toBe(Math.round((5 / 35) * 100));
    expect(meterPercent(outcome, new Set(['a']))).toBe(Math.round((15 / 35) * 100));
  });

  it('caps the meter at 0–100 even for lower-is-better overshoot', () => {
    const lower = { label: 'Risk', base: 10, betterWhen: 'lower' as const, deltas: { a: -10, b: -10 } };
    expect(meterPercent(lower, new Set(['a', 'b']))).toBe(100);
    expect(meterPercent(lower, new Set())).toBe(0);
  });

  it('composes a speakable verdict', () => {
    expect(verdict([outcome], new Set(['a']))).toBe('Coverage 60');
  });
});

describe('quiz', () => {
  const question = {
    prompt: 'Pick one',
    options: [
      { text: 'Wrong', why: 'Because.' },
      { text: 'Right', why: 'Because.', correct: true },
      { text: 'Also wrong', why: 'Because.' },
    ],
  };

  it('knows the answer key and scores honestly', () => {
    expect(correctIndex(question)).toBe(1);
    expect(isAnswerCorrect(question, 1)).toBe(true);
    expect(isAnswerCorrect(question, 0)).toBe(false);
    expect(scoreOf([1, 0, undefined], [question, question, question])).toBe(1);
  });

  it('treats an unanswered question as not correct', () => {
    expect(isAnswerCorrect(question, -1)).toBe(false);
    expect(scoreOf([], [question])).toBe(0);
  });
});

import { clampOpen, nextLayer } from '@/lib/figures/layers';
import { bucketValue, moveDivider, normalizeShares } from '@/lib/figures/budget';
import { cycleSort, sortRows } from '@/lib/figures/matrix';

describe('layers', () => {
  const layers = [
    { id: 'a', title: 'A', summary: '', facts: ['one'] },
    { id: 'b', title: 'B', summary: '', facts: [] },
  ];
  it('clamps the open layer into the stack', () => {
    expect(clampOpen('b', layers)).toBe('b');
    expect(clampOpen('nope', layers)).toBe('a');
    expect(clampOpen(null, layers)).toBeNull();
  });
  it('cycles next/prev with wraparound', () => {
    expect(nextLayer(layers, 'a', 1)).toBe('b');
    expect(nextLayer(layers, 'b', 1)).toBe('a');
    expect(nextLayer(layers, 'a', -1)).toBe('b');
  });
});

describe('budget', () => {
  it('normalizes shares to a full 100', () => {
    expect(normalizeShares([10, 30])).toEqual([25, 75]);
    expect(normalizeShares([0, 0, 0])).toEqual([100 / 3, 100 / 3, 100 / 3]);
  });
  it('moves a divider and keeps the total fixed', () => {
    const buckets = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    const moved = moveDivider([50, 50], 0, 20, buckets);
    expect(Math.round(moved[0])).toBe(70);
    expect(Math.round(moved[1])).toBe(30);
    expect(moved.reduce((s, x) => s + x, 0)).toBeCloseTo(100);
  });
  it('cannot drag past an empty neighbour', () => {
    const moved = moveDivider([80, 20], 0, 50, [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
    expect(moved[1]).toBeCloseTo(0);
  });
  it('maps shares to real units and clamps at caps', () => {
    const totals = { value: 1000, unit: 'KB' };
    expect(bucketValue({ id: 'x', label: 'X' }, 25, totals)).toBe(250);
    expect(bucketValue({ id: 'x', label: 'X', max: 100 }, 25, totals)).toBe(100);
  });
});

describe('matrix', () => {
  const columns = [{ key: 'n', label: 'N', numeric: true }, { key: 't', label: 'T' }];
  const rows = [
    { label: 'r1', cells: { n: 3, t: 'b' } },
    { label: 'r2', cells: { n: 1, t: 'a' } },
    { label: 'r3', cells: { n: 2, t: 'a' } },
  ];
  it('cycles asc → desc → data order', () => {
    expect(cycleSort(null, 'n')).toEqual({ key: 'n', dir: 'asc' });
    expect(cycleSort({ key: 'n', dir: 'asc' }, 'n')).toEqual({ key: 'n', dir: 'desc' });
    expect(cycleSort({ key: 'n', dir: 'desc' }, 'n')).toBeNull();
  });
  it('sorts numerically, stably, both directions', () => {
    expect(sortRows(rows, columns, { key: 'n', dir: 'asc' }).map((r) => r.label)).toEqual(['r2', 'r3', 'r1']);
    expect(sortRows(rows, columns, { key: 'n', dir: 'desc' }).map((r) => r.label)).toEqual(['r1', 'r3', 'r2']);
  });
  it('sorts text columns with data order as tiebreak', () => {
    expect(sortRows(rows, columns, { key: 't', dir: 'asc' }).map((r) => r.label)).toEqual(['r2', 'r3', 'r1']);
  });
});
