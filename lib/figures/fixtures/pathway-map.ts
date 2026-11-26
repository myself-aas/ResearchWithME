import type { PathwayStage } from '../pathway';

/** Fixture for the PathwayMap demo on /lab: a neutral adoption pathway. */
export const PATHWAY_MAP_FIXTURE = {
  title: 'One adoption pathway, your choices',
  subtitle: 'Pick an option at each fork; the route lights and its commitments accumulate.',
  costUnit: 'services to operate',
  stages: [
    { id: 'host', label: 'Choose where it runs', note: 'the first fork shapes everything after it', options: [
      { id: 'managed', label: 'Managed', detail: 'The vendor operates the stateful part.', cost: 0 },
      { id: 'self', label: 'Self-hosted', detail: 'You own the data services and the restore.', cost: 3 },
    ] },
    { id: 'data', label: 'Choose the storage shape', options: [
      { id: 'single', label: 'Single store', detail: 'Simple to reason about, one backup target.', cost: 1 },
      { id: 'split', label: 'Split stores', detail: 'Faster per workload, more surfaces to secure.', cost: 2 },
    ] },
    { id: 'verify', label: 'Verify before launch', note: 'no fork — this stage is unconditional', },
  ] as PathwayStage[],
};
