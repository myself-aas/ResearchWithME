import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { HotspotPoint } from '@/lib/figures/hotspots';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for "What a p-value does not tell you". The statistics here
 * are computed, not invented: for an effect of d = 0.4 SD, the two-sided
 * p-value at n is 2·(1 − Φ(d·√(n/2))) — the normal-tail values below — and
 * the 95% CI half-width is 1.96/√n, matching the essay's own worked example
 * (0.4 SD at n = 400 → CI 0.06–0.74).
 */

/** The four misreadings, organized as a sortable matrix. */
export const PVALUE_MISREADING_COLUMNS: MatrixColumn[] = [
  { key: 'error', label: 'Error type' },
  { key: 'meaning', label: 'What the p-value means' },
];

export const PVALUE_MISREADING_ROWS: MatrixRow[] = [
  { label: '“There is a 3% chance the null is true.”', cells: { error: 'Inverted conditional', meaning: 'If the null were true, 3% of experiments would produce data this extreme.' } },
  { label: '“We have shown there is no effect.”', cells: { error: 'Absence claim', meaning: 'A large p-value is a failure to detect, not evidence of absence.' } },
  { label: '“The effect is large because p is small.”', cells: { error: 'Size conflation', meaning: 'p conflates effect size with sample size.' } },
  { label: '“p = 0.049 is significant; p = 0.051 is not.”', cells: { error: 'Threshold reification', meaning: 'The threshold is a convention; the quantity is continuous.' } },
];

/** Assumptions behind the test, from the essay's "what to do instead". */
export const PVALUE_ASSUMPTIONS: Assumption[] = [
  { id: 'model', label: 'The model and null are stated explicitly', note: '“no difference in means, assuming independent observations” is a checkable claim' },
  { id: 'independent', label: 'Observations are independent', note: 'part of the stated model' },
  { id: 'registered', label: 'The analysis was pre-registered — or labelled exploratory', note: 'both are honest; conflating them is not' },
];

export const PVALUE_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'What the result supports',
    base: 25,
    unit: '% of the claim',
    betterWhen: 'higher',
    deltas: { model: 25, independent: 25, registered: 25 },
  },
  {
    label: 'Overreach risk',
    base: 100,
    unit: '% of the claim',
    betterWhen: 'lower',
    deltas: { model: -30, independent: -35, registered: -35 },
  },
];

/** Anatomy pins for a results paragraph — where to look, in reading order. */
export const PVALUE_RESULTS_PINS: HotspotPoint[] = [
  {
    id: 'estimate',
    label: 'The estimate',
    detail: 'Lead with it: “The estimated effect was 0.4 SD.” A direction without a magnitude is not a result.',
    x: 14,
    y: 22,
  },
  {
    id: 'interval',
    label: 'The interval',
    detail: '“95% CI 0.06–0.74” carries the estimate, its precision, and the direction of uncertainty in one object. If it is wide, the result is a direction, not a magnitude.',
    x: 38,
    y: 46,
  },
  {
    id: 'p',
    label: 'The p-value',
    detail: '“The data are unusual under the null model” — a statement about data under a model, never about the hypothesis.',
    x: 62,
    y: 30,
  },
  {
    id: 'model',
    label: 'The model and n',
    detail: 'The null and the sample size make surprise interpretable: surprise depends on how hard you looked.',
    x: 84,
    y: 62,
  },
];

/** The misreadings as a self-check, with the correct readings as the key. */
export const PVALUE_QUIZ: QuizQuestion[] = [
  {
    prompt: 'A trial reports p = 0.03. What does that number mean?',
    options: [
      { text: 'The null hypothesis has a 3% chance of being true', why: 'That inverts the conditional probability — the most common misreading.' },
      { text: 'If the null were true, 3% of experiments would produce data at least this extreme', why: 'The p-value is a statement about data under a model, not about the hypothesis.', correct: true },
    ],
  },
  {
    prompt: 'A study reports p = 0.31 and concludes “no effect”. What is actually established?',
    options: [
      { text: 'Absence of an effect', why: 'A large p-value is a failure to detect, not evidence of absence.' },
      { text: 'A failure to detect an effect at this sample size', why: 'The threshold is a convention; absence was not shown.', correct: true },
    ],
  },
  {
    prompt: 'p = 0.049 versus p = 0.051 — what is the honest reading?',
    options: [
      { text: 'One result is real, the other is not', why: 'The underlying quantity is continuous; the threshold is a convention.' },
      { text: 'The two are nearly identical; say so when a result sits near the threshold', why: 'Treat the threshold as a convention and label results near it.', correct: true },
    ],
  },
];

export const PVALUE_FIGURES = [
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'HotspotAtlas', archetype: 'pinned-hotspot-annotation' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
