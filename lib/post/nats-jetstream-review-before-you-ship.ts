import type { StackLayer } from '@/lib/figures/layers';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the NATS Server teardown (commit a0385c9a…, pinned
 * default-branch snapshot). Facts restated from the essay's JetStream layer
 * table, source map, and key findings.
 */

/** The essay's four reliability layers, one open at a time. */
export const NATS_LAYERS: StackLayer[] = [
  {
    id: 'server-account',
    title: 'Server / account',
    summary: 'Memory, disk and resource budgets — source-visible controls.',
    facts: ['Evaluation question: what happens when the budget is reached?'],
  },
  {
    id: 'stream',
    title: 'Stream',
    summary: 'Retention, discard, replicas, storage.',
    facts: ['Evaluation question: which history must survive, and where?'],
  },
  {
    id: 'consumer',
    title: 'Consumer',
    summary: 'Ack timing, retries, pending work.',
    facts: ['Evaluation question: how does a slow or failing worker recover?'],
  },
  {
    id: 'application',
    title: 'Application',
    summary: 'Not established by these structures.',
    facts: ['Evaluation question: can repeating a business operation cause harm? The application must answer this itself.'],
  },
];

export const NATS_GUARANTEE_ASSUMPTIONS: Assumption[] = [
  { id: 'budgets', label: 'Server resource budgets are set deliberately', note: 'JetStream separates server budgets from individual stream policies' },
  { id: 'retention', label: 'Stream retention, storage and replicas are explicit decisions', note: 'each is an adoption decision, not a default' },
  { id: 'recovery', label: 'Slow-worker recovery is designed (ack timing, retries, pending work)', note: 'consumer policy is part of application design' },
  { id: 'idempotent', label: 'External side effects are safe to repeat', note: 'consumer acknowledgments do not establish exactly-once external effects' },
];

export const NATS_GUARANTEE_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Delivery confidence',
    base: 10,
    unit: 'of the checklist',
    betterWhen: 'higher',
    deltas: { budgets: 20, retention: 25, recovery: 25, idempotent: 30 },
  },
  {
    label: 'Label-induced overtrust',
    base: 100,
    unit: 'of the checklist',
    betterWhen: 'lower',
    deltas: { budgets: -20, retention: -25, recovery: -25, idempotent: -30 },
  },
];

/** The essay's server source map, as a sortable table (real file counts). */
export const NATS_SOURCE_COLUMNS: MatrixColumn[] = [
  { key: 'files', label: 'Files', numeric: true },
  { key: 'expression', label: 'Include / exclude' },
];

export const NATS_SOURCE_ROWS: MatrixRow[] = [
  { label: 'Core server (`server/*.go`)', cells: { files: 69, expression: 'exclude `_test.go`' } },
  { label: 'Server tests (`*_test.go`)', cells: { files: 75, expression: 'no exclusion' } },
  { label: 'Server subpackages', cells: { files: 60, expression: 'no exclusion' } },
];

export const NATS_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Do consumer acknowledgments give you exactly-once external side effects?',
    options: [
      { text: 'Yes — acknowledged messages are applied exactly once', why: 'The review\u2019s key finding says acknowledgments do not by themselves establish exactly-once external effects.' },
      { text: 'No — repeating a business operation safely stays the application\u2019s job', why: 'The application layer\u2019s evaluation question is exactly this, and the structures cannot answer it.', correct: true },
    ],
  },
  {
    prompt: 'Are JetStream\u2019s server budgets and stream policies one setting?',
    options: [
      { text: 'Yes — one reliability knob', why: 'The review explicitly rejects a vague reliability label: budgets and stream policies are separate choices.' },
      { text: 'No — server resource budgets are distinct from individual stream policies', why: 'Configuration separates them; retention, storage, and replicas remain explicit adoption decisions.', correct: true },
    ],
  },
  {
    prompt: 'A stream is configured with replicas and retention. Is durability now guaranteed?',
    options: [
      { text: 'Yes — replicas make history survive', why: 'Which history must survive and where is the evaluation question; the settings alone do not answer it.' },
      { text: 'Not by itself — the settings are choices whose consequences you must evaluate', why: 'Explicit controls beat a vague reliability label; what happens when a budget is reached must be asked.', correct: true },
    ],
  },
];

export const NATS_FIGURES = [
  { mdxName: 'LayerStack', archetype: 'accordion-layer-stack' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
