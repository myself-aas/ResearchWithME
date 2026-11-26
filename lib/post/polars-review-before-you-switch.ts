import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { HotspotPoint } from '@/lib/figures/hotspots';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the Polars teardown (commit 34f40615…, pinned snapshot).
 * Facts restated from the essay's decision table, lazy-execution sections,
 * and key findings.
 */

export const POLARS_DECISION_COLUMNS: MatrixColumn[] = [
  { key: 'supported', label: 'What this snapshot supports' },
  { key: 'unmeasured', label: 'What remains unmeasured' },
];

export const POLARS_DECISION_ROWS: MatrixRow[] = [
  { label: 'Lazy instead of eager', cells: { supported: 'Deferred planning and documented pushdown', unmeasured: 'Actual I/O avoided on your files' } },
  { label: 'Streaming collection', cells: { supported: 'Batch execution with operator qualifications', unmeasured: 'Peak RSS, spill volume and fallback impact' } },
  { label: 'SQL plus expressions', cells: { supported: 'README describes a shared engine', unmeasured: 'Complete semantic equivalence for a migration' } },
  { label: 'Distributed execution', cells: { supported: 'README links a separate scaling offering', unmeasured: 'Cluster deployment and its terms' } },
];

/** Anatomy of a lazy query, in execution order, from the essay's sections. */
export const POLARS_QUERY_PINS: HotspotPoint[] = [
  {
    id: 'logical-plan',
    label: 'The logical plan',
    detail: 'A LazyFrame records a logical plan rather than immediately materializing each step — the adjective “lazy” is an optimization opportunity, not a result.',
    x: 14,
    y: 24,
  },
  {
    id: 'predicate',
    label: 'Predicate pushdown',
    detail: 'One documented reason to defer execution: filters move toward the source before rows are materialized.',
    x: 40,
    y: 52,
  },
  {
    id: 'projection',
    label: 'Projection pushdown',
    detail: 'The other documented reason: only the referenced columns are read. Neither is a measurement of your workload.',
    x: 66,
    y: 30,
  },
  {
    id: 'streaming',
    label: 'Streaming execution',
    detail: 'Batch execution with operator qualifications — streaming is not proof that every operator stays within a fixed memory budget.',
    x: 86,
    y: 66,
  },
];

export const POLARS_ASSUMPTIONS: Assumption[] = [
  { id: 'lazy', label: 'The workload is lazy end-to-end', note: 'deferred planning is what enables pushdown' },
  { id: 'qualified', label: 'Every operator is qualified for streaming', note: 'streaming has operator qualifications; some fall back' },
  { id: 'memory', label: 'Peak memory has been measured on real files', note: 'peak RSS and spill volume remain unmeasured by this review' },
  { id: 'equivalence', label: 'SQL ↔ expression equivalence has been checked', note: 'a shared engine is described; complete equivalence is unmeasured' },
];

export const POLARS_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Plan confidence',
    base: 20,
    unit: 'of checklist',
    betterWhen: 'higher',
    deltas: { lazy: 20, qualified: 20, memory: 25, equivalence: 15 },
  },
  {
    label: 'Adjective risk',
    base: 100,
    unit: 'of checklist',
    betterWhen: 'lower',
    deltas: { lazy: -15, qualified: -25, memory: -35, equivalence: -15 },
  },
];

export const POLARS_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Does “streaming” guarantee every operator stays within a fixed memory budget?',
    options: [
      { text: 'Yes — that is what streaming means', why: 'The review\u2019s key finding: streaming is not proof of a fixed memory budget for every operator.' },
      { text: 'No — batch execution carries operator qualifications; peak RSS and spill are unmeasured', why: 'Evaluate the plan, not the adjective.', correct: true },
    ],
  },
  {
    prompt: 'What does a LazyFrame actually record?',
    options: [
      { text: 'Materialized results for each step', why: 'That is eager execution; the whole point of LazyFrame is deferral.' },
      { text: 'A logical plan, deferring execution', why: 'Deferred planning and documented pushdown are what the snapshot supports.', correct: true },
    ],
  },
  {
    prompt: 'Is distributed execution part of this repository\u2019s snapshot?',
    options: [
      { text: 'Yes — fully covered', why: 'The README links a separate scaling offering; cluster deployment and its terms remain unmeasured.' },
      { text: 'No — it links a separate offering; the terms are a follow-up', why: 'The decision table puts cluster deployment and its terms in the unmeasured column.', correct: true },
    ],
  },
];

export const POLARS_FIGURES = [
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'HotspotAtlas', archetype: 'pinned-hotspot-annotation' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
