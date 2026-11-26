import type { StackLayer } from '@/lib/figures/layers';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the Plane teardown (commit da21a8ff…, pinned snapshot).
 * Facts restated from the essay's decision table, Compose paragraph, issue
 * model sections, and key findings.
 */

/** The root Compose responsibilities, as the essay reports them (ref 2). */
export const PLANE_STACK_LAYERS: StackLayer[] = [
  {
    id: 'web',
    title: 'Frontend-facing services',
    summary: 'Web (and admin/space/live per the source map).',
    facts: ['1860 TS/TSX files under `apps/web` alone.'],
  },
  {
    id: 'api',
    title: 'API',
    summary: 'The application service clients talk to.',
    facts: ['776 Python files under `apps/api`.'],
  },
  {
    id: 'workers',
    title: 'Worker and beat-worker',
    summary: 'Background execution, separate from the API.',
    facts: ['Upgrade ownership spans API, workers and a migrator.'],
  },
  {
    id: 'migrator-live',
    title: 'Migrator and live service',
    summary: 'Schema migration and realtime updates.',
    facts: ['A tested upgrade and recovery procedure is the acceptance criterion.'],
  },
  {
    id: 'stateful',
    title: 'Stateful services',
    summary: 'PostgreSQL, `plane-redis` (Valkey image), RabbitMQ, object storage.',
    facts: ['Database and upload volumes are the data-recovery surface.'],
  },
];

export const PLANE_DECISION_COLUMNS: MatrixColumn[] = [
  { key: 'evidence', label: 'Evidence in the snapshot' },
  { key: 'criterion', label: 'Acceptance criterion to define' },
];

export const PLANE_DECISION_ROWS: MatrixRow[] = [
  { label: 'Workflow migration', cells: { evidence: 'Rich issue relationships and filters', criterion: 'Preserve inactive records and relationship meaning' } },
  { label: 'Identifier generation', cells: { evidence: 'Project-derived lock in one save path', criterion: 'Concurrent imports and creation behave as intended' } },
  { label: 'Upgrade ownership', cells: { evidence: 'API, workers and a migrator', criterion: 'Tested upgrade and recovery procedure' } },
  { label: 'Data recovery', cells: { evidence: 'Database and upload volumes', criterion: 'Consistent restore of records and attachments' } },
];

export const PLANE_MIGRATION_ASSUMPTIONS: Assumption[] = [
  { id: 'counts', label: 'Source and destination counts are compared by record type and status', note: 'not only by what the ordinary work-item view shows' },
  { id: 'inactive', label: 'Inactive records are verified', note: 'the default manager excludes triage, archived, archived-project and draft records' },
  { id: 'identifiers', label: 'Historical identifiers and relationships are verified with fixtures', note: 'the sequence lock is one save path, with a bulk-insert TODO nearby' },
  { id: 'restore', label: 'A consistent restore of records and attachments has been rehearsed', note: 'database and upload volumes are both in scope' },
];

export const PLANE_MIGRATION_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Migration confidence',
    base: 0,
    unit: 'of checklist',
    betterWhen: 'higher',
    deltas: { counts: 25, inactive: 25, identifiers: 25, restore: 25 },
  },
  {
    label: 'Silent-loss risk',
    base: 100,
    unit: 'of checklist',
    betterWhen: 'lower',
    deltas: { counts: -25, inactive: -30, identifiers: -20, restore: -25 },
  },
];

export const PLANE_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Does the default Issue query give you a complete export?',
    options: [
      { text: 'Yes — it shows all the work', why: 'The default manager excludes triage, archived, archived-project and draft records — a meaningful warning.' },
      { text: 'No — compare counts by record type and status instead', why: 'The review\u2019s migration recommendation, grounded in the queryset\u2019s scope.', correct: true },
    ],
  },
  {
    prompt: 'The project-derived advisory lock proves what, exactly?',
    options: [
      { text: 'Concurrency correctness on every path', why: 'The essay is explicit: it is a narrow source observation, not proof of all-path correctness.' },
      { text: 'Deliberate project-local coordination in that one save path', why: 'And the same file contains a TODO about bulk-insert identifiers.', correct: true },
    ],
  },
  {
    prompt: 'Self-hosting Plane removes administration, right?',
    options: [
      { text: 'Right — it is just an app', why: 'The Compose file exposes application, worker, migrator and stateful-service responsibilities.' },
      { text: 'No — self-hosting is a service lifecycle you own', why: 'API, workers and a migrator, plus PostgreSQL, Valkey, RabbitMQ and object storage.', correct: true },
    ],
  },
];

export const PLANE_FIGURES = [
  { mdxName: 'LayerStack', archetype: 'accordion-layer-stack' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
