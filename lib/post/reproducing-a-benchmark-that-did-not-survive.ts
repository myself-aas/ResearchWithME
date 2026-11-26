import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { PathwayStage } from '@/lib/figures/pathway';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for "I tried to reproduce the benchmark everyone cites.
 * It did not survive." Facts restated from the essay's measurement table,
 * the three undocumented choices, and the reporting checklist.
 */

/** The measurements (essay §3, reproduced table). */
export const BENCH_RESULT_COLUMNS: MatrixColumn[] = [
  { key: 'baseline', label: 'Baseline' },
  { key: 'scheduler', label: 'Their scheduler' },
  { key: 'ratio', label: 'Ratio', numeric: true },
];

export const BENCH_RESULT_ROWS: MatrixRow[] = [
  { label: 'Warm, five runs (req/s)', cells: { baseline: '4,180', scheduler: '9,910', ratio: 2.37 } },
  { label: 'Cold, fresh process (req/s)', cells: { baseline: '3,940', scheduler: '3,010', ratio: 0.76 } },
  { label: 'Cold, p99 latency', cells: { baseline: '118 ms', scheduler: '402 ms', ratio: 3.41 } },
];

/** The three choices (essay §4); each fork = publish as-is vs answer the stated question. */
export const BENCH_GAP_STAGES: PathwayStage[] = [
  {
    id: 'warmup',
    label: 'Where does warm-up sit?',
    options: [
      { id: 'excluded', label: 'Excluded from the measurement', detail: 'Standard practice for serving benchmarks — and invisible unless you read the harness.', cost: 1 },
      { id: 'inside', label: 'Inside the measurement window', detail: 'The routing table compiles on first request; a fresh deployment pays it inside the measurement.', cost: 0 },
    ],
  },
  {
    id: 'lifetime',
    label: 'How many process lifetimes?',
    options: [
      { id: 'one', label: 'One warm server, requests looped', detail: 'Cold start never appears in the data.', cost: 1 },
      { id: 'fresh', label: 'A fresh process per measurement', detail: 'The cold-start question the paper never states.', cost: 0 },
    ],
  },
  {
    id: 'baseline',
    label: 'How is the baseline treated?',
    options: [
      { id: 'cold', label: 'Baseline starts cold every repetition', detail: 'Favours the proposed system by construction — the one I would raise in review.', cost: 2 },
      { id: 'same', label: 'Baseline gets the same warm-up', detail: 'The comparison then answers the same question both sides.', cost: 0 },
    ],
  },
  {
    id: 'scope',
    label: 'Report the scope',
    note: '"2.4\u00d7" and "2.4\u00d7 at steady state" are different sentences; only one is true',
  },
];

/** The reporting checklist (essay §5 callout) as switches. */
export const BENCH_CHECKLIST_ASSUMPTIONS: Assumption[] = [
  { id: 'lifetime', label: '(a) Process lifetime is published', note: 'one warm server, or fresh per measurement' },
  { id: 'warmup', label: '(b) Warm-up placement is stated', note: 'inside or outside the measurement window' },
  { id: 'commands', label: '(c) The exact command per row', note: 'the harness call that produced each number' },
  { id: 'baseline', label: '(d) The same information for the baseline', note: 'the comparison\u2019s configuration, not just the proposed system\u2019s' },
];

export const BENCH_CHECKLIST_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Reproducible in an afternoon',
    base: 0,
    unit: 'of checklist',
    betterWhen: 'higher',
    deltas: { lifetime: 25, warmup: 25, commands: 25, baseline: 25 },
  },
  {
    label: 'Underspecified-measurement risk',
    base: 100,
    unit: 'of checklist',
    betterWhen: 'lower',
    deltas: { lifetime: -25, warmup: -25, commands: -25, baseline: -25 },
  },
];

export const BENCH_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Under the published configuration, the 2.4\u00d7 gain:',
    options: [
      { text: 'Reproduces as stated', why: 'Only under the authors\u2019 unpublished warm-up schedule — the warm run lands within 6% of the paper.' },
      { text: 'Reproduces only with the unpublished warm-up schedule', why: 'The headline number is real, but only in that configuration.', correct: true },
    ],
  },
  {
    prompt: 'On cold starts, the baseline is:',
    options: [
      { text: 'Still slower than the scheduler', why: 'Inverted: the baseline is 1.3\u00d7 faster on the same hardware (3,940 vs 3,010 req/s).', },
      { text: '1.3\u00d7 faster on the same hardware', why: 'Cold-start measurements invert the result.', correct: true },
    ],
  },
  {
    prompt: 'Which of the three choices does the post say is hardest to defend?',
    options: [
      { text: 'Warm-up excluded from the measurement', why: 'That is standard practice — a documentation failure.' },
      { text: 'The baseline is not given the same warm-up', why: 'A comparison that favours the proposed system by construction.', correct: true },
    ],
  },
  {
    prompt: 'What happened after the author sent the numbers to the paper\u2019s authors?',
    options: [
      { text: 'The claim was withdrawn', why: 'One author confirmed the routing-table cache and added a README note.' },
      { text: 'The claim was scoped, not withdrawn', why: 'The repository note at v0.9.4-notes is the right outcome.', correct: true },
    ],
  },
];

export const BENCH_FIGURES = [
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'PathwayMap', archetype: 'route-choice-pathway' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
];
