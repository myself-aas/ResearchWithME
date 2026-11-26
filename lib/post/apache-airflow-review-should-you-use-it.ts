import type { StackLayer } from '@/lib/figures/layers';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for "Apache Airflow 3.4 review: orchestration trade-offs".
 * Every value below is restated from the essay's own tables and review
 * limits (all bound to the pinned commit's citations) — nothing measured,
 * nothing invented. The manifest at the foot is the constitution contract
 * (Article 10): ≥ 4 distinct interaction archetypes, all generative UI.
 */

/** The architecture table, restated as an expandable stack (refs [2][4]). */
export const AIRFLOW_LAYERS: StackLayer[] = [
  {
    id: 'dag-processor',
    title: 'DAG processor and bundles',
    summary: 'Parse DAG definitions and serialize them into the metadata database.',
    facts: [
      'Makes the appropriate DAG version available.',
      'DAG distribution and parse-time behaviour are operational concerns.',
    ],
  },
  {
    id: 'scheduler',
    title: 'Scheduler',
    summary: 'Decides when runs and tasks progress, and submits work through executors.',
    facts: [
      'Worker capacity is not the only possible source of delay.',
      'The enqueue path checks pool capacity before routing work (source observation, ref 3).',
    ],
  },
  {
    id: 'executor',
    title: 'Executor',
    summary: 'Provides the execution mechanism selected by configuration.',
    facts: ['Local, queued-worker, and container-based models have different costs.'],
  },
  {
    id: 'api-server',
    title: 'API server',
    summary: 'Serves UI/API access; task SDK code reports state through the Execution API.',
    facts: ['Airflow 3 should not be described using only an older webserver-plus-workers diagram.'],
  },
  {
    id: 'metadata-db',
    title: 'Metadata database',
    summary: 'Persists task, DAG, and other orchestration state.',
    facts: ['Database configuration and maintenance matter to the control plane.'],
  },
  {
    id: 'triggerer',
    title: 'Triggerer, when needed',
    summary: 'Runs asynchronous trigger work for deferred tasks.',
    facts: ['Deferred workloads introduce another component to operate.'],
  },
];

/** The review's evidence ledger: what kind of claim each finding rests on. */
export const AIRFLOW_EVIDENCE_COLUMNS: MatrixColumn[] = [
  { key: 'kind', label: 'Evidence kind' },
  { key: 'source', label: 'Established from' },
];

export const AIRFLOW_EVIDENCE_ROWS: MatrixRow[] = [
  { label: 'Scheduling and execution are distinct', cells: { kind: 'Documentation', source: 'Architecture overview + executor guide' } },
  { label: 'Capacity checks before enqueue', cells: { kind: 'Source code', source: 'SchedulerJobRunner enqueue path' } },
  { label: 'Retries need retry-safe tasks', cells: { kind: 'Documentation', source: 'Best-practices guide' } },
  { label: 'Production topology decisions', cells: { kind: 'Documentation', source: 'Deployment + security model guides' } },
  { label: 'DAG authors are not sandboxed', cells: { kind: 'Documentation', source: 'Security model, reviewed version' } },
  { label: 'Throughput or latency numbers', cells: { kind: 'Not measured', source: 'No benchmark was run in this review' } },
  { label: 'Production isolation guarantees', cells: { kind: 'Not certified', source: 'No security probe was run' } },
];

/** The pilot-preparation checklist, restated as assumption switches. */
export const AIRFLOW_PILOT_ASSUMPTIONS: Assumption[] = [
  { id: 'external-db', label: 'Pilot runs on an external database', note: 'the reviewed guide calls SQLite a testing default' },
  { id: 'constraints', label: 'Install is pinned to a constraints file', note: 'open ranges make an unconstrained install unreliable' },
  { id: 'remote-logs', label: 'Task logs land on remote storage', note: 'workers are disposable by design' },
  { id: 'health-checks', label: 'Scheduler health checks are enabled', note: 'component health needs a signal' },
];

export const AIRFLOW_PILOT_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Pilot readiness',
    base: 15,
    unit: '% of the checklist',
    betterWhen: 'higher',
    deltas: { 'external-db': 25, constraints: 20, 'remote-logs': 20, 'health-checks': 20 },
  },
  {
    label: 'Guesswork remaining',
    base: 100,
    unit: '% of the checklist',
    betterWhen: 'lower',
    deltas: { 'external-db': -25, constraints: -20, 'remote-logs': -20, 'health-checks': -20 },
  },
];

/** Quiz facts, each restated from a cited finding. */
export const AIRFLOW_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Is Airflow a streaming solution?',
    options: [
      { text: 'Yes — it processes stream data continuously', why: 'The README explicitly says it is not a streaming solution; it can orchestrate batch work that reads from streams.' },
      { text: 'No — it coordinates tasks and their dependencies', why: 'It is a workflow orchestrator and recommends delegating high-volume processing to specialized services.', correct: true },
    ],
  },
  {
    prompt: 'In the reviewed Airflow 3 architecture, where does executor logic run?',
    options: [
      { text: 'In a standalone service every deployment launches', why: 'The executor guide does not require a separate service per deployment.' },
      { text: 'Inside the scheduler', why: 'The executor logic runs inside the scheduler, not as a standalone service.', correct: true },
    ],
  },
  {
    prompt: 'Are DAG authors sandboxed by Airflow?',
    options: [
      { text: 'No — the security model treats them as code authors with substantial trust', why: 'Their code can execute in workers, the DAG processor, and the triggerer.', correct: true },
      { text: 'Yes — task-level isolation is guaranteed', why: 'The reviewed model says the experimental multi-team feature does not yet guarantee full task-level isolation.' },
    ],
  },
];

/** Constitution manifest: the figures this post adopts (Article 10). */
export const AIRFLOW_FIGURES = [
  { mdxName: 'LayerStack', archetype: 'accordion-layer-stack' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
