import type { RaceSeries } from '../race';

/**
 * Fixture for the RacePlayback demo on /lab: three neutral approaches
 * replayed over ten rounds. Deterministic data — no timers, no randomness.
 */
export const RACE_PLAYBACK_FIXTURE = {
  series: [
    {
      label: 'Approach A',
      points: [12, 18, 26, 33, 38, 41, 43, 44, 44.5, 45],
      tone: 'brand',
    },
    {
      label: 'Approach B',
      points: [8, 14, 22, 31, 39, 44, 47, 49, 50, 51],
      tone: 'emerging',
    },
    {
      label: 'Approach C',
      points: [20, 21, 23, 24, 26, 27, 28, 29, 30, 30.5],
      tone: 'insight',
    },
  ] as RaceSeries[],
  unit: 'score',
};
