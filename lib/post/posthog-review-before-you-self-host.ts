import type { StackLayer } from '@/lib/figures/layers';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the PostHog teardown (commit 4e10f441…, pinned snapshot).
 * Facts restated from the essay's decision table, the hobby Compose
 * paragraph, and key findings.
 */

/** The hobby Compose stack, as the essay reports it (ref 3). */
export const POSTHOG_STACK_LAYERS: StackLayer[] = [
  {
    id: 'app',
    title: 'The application',
    summary: 'Product analytics, replay, flags and experiments — per the README.',
    facts: ['The hobby Compose file is explicitly labeled hobby-only.'],
  },
  {
    id: 'postgres-redis',
    title: 'PostgreSQL, Redis, Valkey',
    summary: 'Named stateful dependencies in the hobby definition.',
    facts: ['Several definitions extend a base Compose file.'],
  },
  {
    id: 'clickhouse',
    title: 'ClickHouse',
    summary: 'With ClickHouse depending on Kafka and ZooKeeper.',
    facts: ['One analytics process is not what the overlay describes.'],
  },
  {
    id: 'topology',
    title: 'The resolved topology',
    summary: 'The inspected overlay alone is not a complete resolved production topology.',
    facts: ['“Self-host the analytics app” carries more stateful responsibility than one process and one volume.'],
  },
];

export const POSTHOG_DECISION_COLUMNS: MatrixColumn[] = [
  { key: 'evidence', label: 'Evidence at this pin' },
  { key: 'followup', label: 'Required follow-up' },
];

export const POSTHOG_DECISION_ROWS: MatrixRow[] = [
  { label: 'Hosted versus self-hosted', cells: { evidence: 'README recommends Cloud; hobby has no support guarantee', followup: 'Obtain the support and deployment commitments you need' } },
  { label: 'Operating burden', cells: { evidence: 'Hobby overlay names multiple data services', followup: 'Resolve the full stack and practice restore' } },
  { label: 'Reuse rights', cells: { evidence: 'MIT Expat with explicit enterprise exception', followup: 'Inspect the exact code and terms being used' } },
  { label: 'Privacy suitability', cells: { evidence: 'Product includes event collection and replay', followup: 'Validate actual capture, retention and access settings' } },
];

export const POSTHOG_ASSUMPTIONS: Assumption[] = [
  { id: 'commitments', label: 'Support and deployment commitments are obtained in writing', note: 'hobby self-hosting has no support guarantee' },
  { id: 'restore', label: 'A full restore has been practiced', note: 'the overlay names multiple stateful services, not one volume' },
  { id: 'license', label: 'The exact code and terms in use have been inspected', note: 'MIT Expat root terms explicitly exclude the enterprise directory' },
  { id: 'privacy', label: 'Capture, retention and access settings are validated', note: 'the product includes event collection and session replay' },
];

export const POSTHOG_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Operational parity',
    base: 0,
    unit: 'of checklist',
    betterWhen: 'higher',
    deltas: { commitments: 25, restore: 30, license: 20, privacy: 25 },
  },
  {
    label: 'Visibility-induced overtrust',
    base: 100,
    unit: 'of checklist',
    betterWhen: 'lower',
    deltas: { commitments: -25, restore: -30, license: -20, privacy: -25 },
  },
];

export const POSTHOG_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Does repository access make self-hosting equivalent to the supported hosted product?',
    options: [
      { text: 'Yes — same code, same product', why: 'The review\u2019s bottom line: source visibility is not operational parity.' },
      { text: 'No — the README recommends Cloud and labels self-hosting an advanced hobby deployment', why: 'The deployment distinction matters more to procurement than the feature list.', correct: true },
    ],
  },
  {
    prompt: 'How many stateful services does the hobby Compose file name?',
    options: [
      { text: 'One — the app plus one volume', why: 'The overlay explicitly names PostgreSQL, Redis, Valkey, and ClickHouse (which depends on Kafka and ZooKeeper).' },
      { text: 'Several — and several definitions extend a base Compose file', why: 'The essay establishes more stateful responsibility than one process and one volume.', correct: true },
    ],
  },
  {
    prompt: 'Do the MIT Expat root terms cover the enterprise directory?',
    options: [
      { text: 'Yes — everything is MIT', why: 'The root terms explicitly exclude the enterprise directory; inspect the exact code being used.' },
      { text: 'No — the exclusion is explicit in the root terms', why: 'Reuse rights need a separate review, not an assumption from the license badge.', correct: true },
    ],
  },
];

export const POSTHOG_FIGURES = [
  { mdxName: 'LayerStack', archetype: 'accordion-layer-stack' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
