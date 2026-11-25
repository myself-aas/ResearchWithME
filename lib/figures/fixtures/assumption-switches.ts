import type { Assumption, AssumptionOutcome } from '../assumptions';

/**
 * Fixture for the AssumptionSwitches demo on /lab: which assumptions a field
 * survey stands on, and what each one is worth to two outcomes.
 */
export const ASSUMPTION_SWITCHES_FIXTURE = {
  assumptions: [
    { id: 'labeled', label: 'Labels verified by two reviewers', note: 'removes annotation noise' },
    { id: 'dry', label: 'Survey ran in the dry season', note: 'roads and plots reachable' },
    { id: 'paired', label: 'Pairs sampled across the boundary', note: 'controls for soil' },
  ] as Assumption[],
  outcomes: [
    {
      label: 'Coverage',
      base: 54,
      unit: '% of plots',
      betterWhen: 'higher',
      deltas: { labeled: 6, dry: 22, paired: 9 },
    },
    {
      label: 'Bias risk',
      base: 31,
      unit: 'index',
      betterWhen: 'lower',
      deltas: { labeled: -8, dry: -5, paired: -12 },
    },
  ] as AssumptionOutcome[],
};
