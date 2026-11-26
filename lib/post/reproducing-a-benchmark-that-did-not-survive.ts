import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { PathwayStage } from '@/lib/figures/pathway';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Unverified teaching fixtures retained from the supplied draft.
 * These values have no public harness or raw runs and are not measured results.
 * Keep that status visible both in article bindings and shared generative UI.
 */

export const BENCH_RESULT_COLUMNS: MatrixColumn[] = [
  { key: 'baseline', label: 'Baseline' },
  { key: 'scheduler', label: 'Illustrative scheduler' },
  { key: 'ratio', label: 'Ratio', numeric: true },
];

export const BENCH_RESULT_ROWS: MatrixRow[] = [
  { label: 'Illustrative warm (req/s)', cells: { baseline: '4,180', scheduler: '9,910', ratio: 2.37 } },
  { label: 'Illustrative cold (req/s)', cells: { baseline: '3,940', scheduler: '3,010', ratio: 0.76 } },
  { label: 'Illustrative cold p99', cells: { baseline: '118 ms', scheduler: '402 ms', ratio: 3.41 } },
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
      { id: 'fresh', label: 'A fresh process per measurement', detail: 'A separate cold-start evaluation question.', cost: 0 },
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
    note: 'An illustrative steady-state ratio does not establish cold-start performance',
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
    label: 'Reporting completeness (illustrative checklist)',
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
    prompt: 'What do the numbers in this teaching fixture establish?',
    options: [
      { text: 'An independently reproduced speedup', why: 'No public harness or raw runs support that claim.' },
      { text: 'An illustrative comparison only', why: 'The supplied draft values remain unverified, not observed performance.', correct: true },
    ],
  },
  {
    prompt: 'What does the illustrative cold throughput ratio compare?',
    options: [
      { text: '3,010 divided by 3,940', why: 'This is approximately 0.76 for the supplied illustrative values, not a hardware result.', correct: true },
      { text: 'A measured universal cold-start advantage', why: 'The fixture does not establish performance outside its hypothetical example.' },
    ],
  },
  {
    prompt: 'What must a matched comparison control?',
    options: [
      { text: 'Only the proposed system’s warm-up', why: 'Different initialization policies can answer different questions.' },
      { text: 'Both implementations’ timing boundaries and workloads', why: 'Record environment, process lifetime, initialization and workload for both.', correct: true },
    ],
  },
  {
    prompt: 'Does the supplied material substantiate an upstream correction?',
    options: [
      { text: 'No; a traceable public record is still needed', why: 'The draft’s alleged author correspondence and repository note were not supplied as evidence.', correct: true },
      { text: 'Yes, the quiz itself proves correspondence occurred', why: 'A teaching fixture cannot establish a real author response.' },
    ],
  },
];

export const BENCH_FIGURES = [
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'PathwayMap', archetype: 'route-choice-pathway' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
];
