import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { HotspotPoint } from '@/lib/figures/hotspots';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the n8n repository teardown (commit a857c50b…, pinned
 * default-branch snapshot). Every fact is restated from the essay's own
 * concerns table, execution sections, and key findings — documented or
 * source-observed, never measured.
 */

export const N8N_CONCERNS_COLUMNS: MatrixColumn[] = [
  { key: 'evidence', label: 'Static evidence' },
  { key: 'question', label: 'Unresolved adoption question' },
];

export const N8N_CONCERNS_ROWS: MatrixRow[] = [
  { label: 'Manual versus queued run', cells: { evidence: 'Explicit routing condition', question: 'Does the production path behave like the editor trial?' } },
  { label: 'Node failure', cells: { evidence: 'Conditional retry budget', question: 'Is the external operation safe to repeat?' } },
  { label: 'Cancellation', cells: { evidence: 'Wait helper checks cancellation', question: 'What happens to already-issued external requests?' } },
  { label: 'Access and credentials', cells: { evidence: 'README positions enterprise features', question: 'Which controls exist in the selected edition and configuration?' } },
];

/** Anatomy of one workflow run, in execution order, from the essay's sections. */
export const N8N_RUN_PINS: HotspotPoint[] = [
  {
    id: 'trigger',
    label: 'The canvas is the trigger',
    detail: 'Treat the canvas as executable infrastructure: what looks like a diagram is the workflow that runs.',
    x: 12,
    y: 20,
  },
  {
    id: 'routing',
    label: 'Routing is not one universal path',
    detail: 'The runner distinguishes queued and main-process execution; an explicit routing condition separates manual from queued runs.',
    x: 36,
    y: 44,
  },
  {
    id: 'retry',
    label: 'The retry helper',
    detail: 'The inspected node retry helper contains eligibility rules and bounded defaults — retry configuration is conditional, not a guarantee.',
    x: 60,
    y: 32,
  },
  {
    id: 'cancellation',
    label: 'Cancellation',
    detail: 'The wait helper checks cancellation — but what happens to already-issued external requests is an adoption question the structures cannot answer.',
    x: 84,
    y: 64,
  },
];

export const N8N_ADOPTION_ASSUMPTIONS: Assumption[] = [
  { id: 'parity', label: 'The production path has been compared with the editor trial', note: 'manual and queued runs route explicitly differently' },
  { id: 'idempotent', label: 'Every external operation is safe to repeat', note: 'a retry budget repeats work; it does not make it atomic' },
  { id: 'license', label: 'The restricted source-available terms have been read', note: 'not interchangeable with MIT or Apache licensing' },
  { id: 'edition', label: 'The selected edition\u2019s credential controls are known', note: 'the README positions enterprise features separately' },
];

export const N8N_ADOPTION_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Adoption readiness',
    base: 0,
    unit: 'of checklist',
    betterWhen: 'higher',
    deltas: { parity: 25, idempotent: 30, license: 25, edition: 20 },
  },
  {
    label: 'Unpriced risk',
    base: 100,
    unit: 'of checklist',
    betterWhen: 'lower',
    deltas: { parity: -25, idempotent: -30, license: -25, edition: -20 },
  },
];

export const N8N_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Does configuring node retries make a business action atomic?',
    options: [
      { text: 'Yes — retries guarantee the action happens exactly once', why: 'The essay\u2019s whole point: retry configuration does not make a business action atomic.' },
      { text: 'No — a retry budget repeats work; repeat safety is yours to establish', why: 'The retry helper has eligibility rules and bounded defaults; the external operation must be safe to repeat.', correct: true },
    ],
  },
  {
    prompt: 'How does the runner treat manual and queued runs?',
    options: [
      { text: 'One universal execution path', why: 'The review\u2019s finding is the opposite: execution routing is not one universal path.' },
      { text: 'An explicit routing condition separates them', why: 'The runner distinguishes queued and main-process execution — check production parity with the editor trial.', correct: true },
    ],
  },
  {
    prompt: 'n8n\u2019s license is equivalent to MIT or Apache, right?',
    options: [
      { text: 'Right — source-available means permissive', why: 'The essay says n8n is source-available under restricted terms, not interchangeable with MIT or Apache.' },
      { text: 'Wrong — restricted terms require their own review', why: 'Source available is not unrestricted reuse; read the terms before adopting.', correct: true },
    ],
  },
];

export const N8N_FIGURES = [
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'HotspotAtlas', archetype: 'pinned-hotspot-annotation' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
