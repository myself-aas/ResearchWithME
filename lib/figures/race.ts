/**
 * Pure logic for the RacePlayback figure (archetype: playback-race-series).
 * A tick-transport replays several ordered series; ranks and the leader are
 * derived here so the component stays a thin, deterministic renderer.
 */

export type RaceSeries = {
  label: string;
  /** One value per tick; shorter series hold their last value. */
  points: number[];
  tone: 'brand' | 'emerging' | 'insight' | 'ink';
}

export function tickCount(series: RaceSeries[]): number {
  return series.reduce((max, line) => Math.max(max, line.points.length), 1);
}

export function clampTick(tick: number, total: number): number {
  if (!Number.isFinite(tick)) return 0;
  return Math.min(Math.max(Math.round(tick), 0), Math.max(total - 1, 0));
}

/** A series' value at a tick; a finished series holds its final value. */
export function valueAt(series: RaceSeries, tick: number): number {
  if (series.points.length === 0) return 0;
  const index = Math.min(Math.max(Math.round(tick), 0), series.points.length - 1);
  return series.points[index];
}

/** Stable ranking: highest value first; ties keep registration order. */
export function ranks(values: number[]): number[] {
  return values.map((value) => values.filter((other) => other > value).length);
}

export function leaderIndex(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}
