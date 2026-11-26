import type { PathwayStage } from '@/lib/figures/pathway';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the Perspective API review (new slug:
 * perspective-api-review-before-you-moderate). Facts restated from the
 * essay's data-placement mode table and its "decide the data boundary before
 * the chart" bottom line.
 */

/** The essay's mode table, sortable. */
export const PERSPECTIVE_MODE_COLUMNS: MatrixColumn[] = [
  { key: 'placement', label: 'Data placement described by the source' },
  { key: 'concern', label: 'Adoption concern' },
];

export const PERSPECTIVE_MODE_ROWS: MatrixRow[] = [
  { label: 'Client-only', cells: { placement: 'Entire dataset in the browser', concern: 'Download authorization, memory and application persistence' } },
  { label: 'Replicated', cells: { placement: 'Server table plus browser duplicate', concern: 'Initial transfer, deltas and indexed deletion semantics' } },
  { label: 'Server-only', cells: { placement: 'Server dataset with virtual browser access', concern: 'Connection lifecycle, server load and interaction latency' } },
];

/** The data-boundary pathway: choose the mode, absorb its consequences. */
export const PERSPECTIVE_PATHWAY_STAGES: PathwayStage[] = [
  {
    id: 'boundary',
    label: 'Decide the data boundary first',
    note: 'the review\u2019s bottom line: before the chart, not after',
    options: [
      { id: 'client', label: 'Client-only', detail: 'The entire dataset lives in the browser — download authorization, memory, and persistence become your concerns.', cost: 1 },
      { id: 'replicated', label: 'Replicated', detail: 'A server table plus a browser duplicate — initial transfer, deltas, and indexed deletion semantics.', cost: 2 },
      { id: 'server', label: 'Server-only', detail: 'The dataset stays on the server with virtual browser access — connection lifecycle, load, latency.', cost: 2 },
    ],
  },
  {
    id: 'updates',
    label: 'Plan the update path',
    note: 'updates require an entity model — every mode pays this',
    options: [
      { id: 'model', label: 'Define the entity model', detail: 'Updates require knowing what an entity is; without it, deltas have no meaning.', cost: 1 },
      { id: 'ad-hoc', label: 'Wire updates ad hoc', detail: 'The essay\u2019s warning: replication is not the same as server-only virtualization.', cost: 2 },
    ],
  },
  {
    id: 'chart',
    label: 'Only now pick the chart',
    note: 'the boundary decision shapes what the visualisation can honestly show',
  },
];

export const PERSPECTIVE_ASSUMPTIONS: Assumption[] = [
  { id: 'boundary', label: 'The data boundary decision is written down', note: 'decide it before the chart' },
  { id: 'entity', label: 'An entity model exists for updates', note: 'updates require an entity model' },
  { id: 'deletion', label: 'Deletion semantics are understood in the chosen mode', note: 'indexed deletion is a replicated-mode concern' },
  { id: 'latency', label: 'Interaction latency is acceptable in the chosen mode', note: 'a server-only concern' },
];

export const PERSPECTIVE_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Boundary confidence',
    base: 0,
    unit: 'of checklist',
    betterWhen: 'higher',
    deltas: { boundary: 30, entity: 25, deletion: 20, latency: 25 },
  },
  {
    label: 'Chart-first regret',
    base: 100,
    unit: 'of checklist',
    betterWhen: 'lower',
    deltas: { boundary: -35, entity: -25, deletion: -20, latency: -20 },
  },
];

export const PERSPECTIVE_QUIZ: QuizQuestion[] = [
  {
    prompt: 'In the reviewed source, where does a client-only mode keep the dataset?',
    options: [
      { text: 'On the server, streamed on demand', why: 'That is server-only mode: virtual browser access with connection lifecycle concerns.' },
      { text: 'Entirely in the browser', why: 'Which makes download authorization, memory, and application persistence the adoption concerns.', correct: true },
    ],
  },
  {
    prompt: 'Is “replicated” the same as “server-only with virtual access”?',
    options: [
      { text: 'Yes — both mean the server holds the data', why: 'The essay\u2019s section title says the opposite: replication is not the same as server-only virtualization.' },
      { text: 'No — replicated duplicates data in the browser; server-only virtualizes access', why: 'Different placements, different concerns: deltas and deletion vs connection lifecycle and latency.', correct: true },
    ],
  },
  {
    prompt: 'What should be decided first, according to the review?',
    options: [
      { text: 'The chart library', why: 'The bottom line is explicit: decide the data boundary before the chart.' },
      { text: 'The data boundary', why: 'Then the update path (an entity model), and only then what the chart can honestly show.', correct: true },
    ],
  },
];

export const PERSPECTIVE_FIGURES = [
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'PathwayMap', archetype: 'route-choice-pathway' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
