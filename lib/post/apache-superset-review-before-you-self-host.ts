import type { OrgNode } from '@/lib/figures/tree';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the Apache Superset review (new slug:
 * apache-superset-review-before-you-self-host). Facts restated from the
 * essay's asset table, trust-model section, and bottom line.
 */

/** The platform around Superset, as a structure (the essay's asset table). */
export const SUPERSET_PLATFORM: OrgNode[] = [
  {
    id: 'superset',
    label: 'Superset',
    role: 'the application you self-host',
    children: [
      {
        id: 'warehouse',
        label: 'Warehouse / data source',
        role: 'executes analytical queries',
        children: [
          { id: 'identity', label: 'The configured database identity', role: 'what can it read or change?' },
        ],
      },
      {
        id: 'metadata',
        label: 'Metadata database',
        role: 'stores application definitions and users',
        count: 1,
        countUnit: 'restore question',
        children: [
          { id: 'restore', label: 'Consistent application state', role: 'can the team restore it?' },
        ],
      },
      {
        id: 'cache-broker',
        label: 'Cache / broker',
        role: 'results reuse and worker messaging',
        children: [
          { id: 'expiry', label: 'Expiry, loss, reconnect', role: 'what happens on each?' },
        ],
      },
      {
        id: 'workers',
        label: 'Worker and beat',
        role: 'asynchronous and scheduled tasks',
        children: [
          { id: 'failures', label: 'Failure visibility', role: 'are failures seen and schedules recovered?' },
        ],
      },
    ],
  },
];

export const SUPERSET_ASSET_COLUMNS: MatrixColumn[] = [
  { key: 'responsibility', label: 'Source-described responsibility' },
  { key: 'question', label: 'Evaluation question' },
];

export const SUPERSET_ASSET_ROWS: MatrixRow[] = [
  { label: 'Warehouse/data source', cells: { responsibility: 'Executes analytical queries', question: 'What can the configured database identity read or change?' } },
  { label: 'Metadata database', cells: { responsibility: 'Stores application definitions and users', question: 'Can the team restore a consistent application state?' } },
  { label: 'Cache/broker', cells: { responsibility: 'Results reuse and worker messaging', question: 'What happens on expiry, loss or reconnect?' } },
  { label: 'Worker and beat', cells: { responsibility: 'Asynchronous and scheduled tasks', question: 'Are failures visible and schedules recovered?' } },
];

export const SUPERSET_ASSUMPTIONS: Assumption[] = [
  { id: 'identity', label: 'The database identity\u2019s reach is known and limited', note: 'BI software still needs a platform owner' },
  { id: 'restore', label: 'A consistent metadata restore has been practiced', note: 'definitions and users live there' },
  { id: 'cache', label: 'Cache and broker failure behaviour is understood', note: 'expiry, loss, reconnect' },
  { id: 'trust', label: 'The access-control trust model is explicit', note: 'access controls need an explicit trust model' },
];

export const SUPERSET_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Platform-owner readiness',
    base: 0,
    unit: 'of checklist',
    betterWhen: 'higher',
    deltas: { identity: 25, restore: 30, cache: 20, trust: 25 },
  },
  {
    label: 'Unowned-platform risk',
    base: 100,
    unit: 'of checklist',
    betterWhen: 'lower',
    deltas: { identity: -25, restore: -30, cache: -20, trust: -25 },
  },
];

export const SUPERSET_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Where do Superset\u2019s analytical queries actually execute?',
    options: [
      { text: 'Inside the Superset application', why: 'The source-described responsibility puts query execution in the warehouse/data source.' },
      { text: 'In the configured warehouse or data source', why: 'Which is why the database identity\u2019s reach is the first evaluation question.', correct: true },
    ],
  },
  {
    prompt: 'Is the metadata database just a cache you can lose?',
    options: [
      { text: 'Yes — it can be rebuilt any time', why: 'It stores application definitions and users; the essay asks whether the team can restore a consistent state.' },
      { text: 'No — it holds definitions and users, so restore matters', why: 'Metadata and analytical data are different assets, the essay\u2019s own section title.', correct: true },
    ],
  },
  {
    prompt: 'Do Superset\u2019s built-in access controls remove the need for a trust model?',
    options: [
      { text: 'Yes — they enforce security by default', why: 'The review\u2019s section says access controls need an explicit trust model.' },
      { text: 'No — the trust model is a decision you must make explicitly', why: 'BI software still needs a platform owner; controls implement a model, they do not choose one.', correct: true },
    ],
  },
];

export const SUPERSET_FIGURES = [
  { mdxName: 'OrgChart', archetype: 'tree-expand-org' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
