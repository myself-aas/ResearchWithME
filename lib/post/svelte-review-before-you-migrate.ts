import type { StackLayer } from '@/lib/figures/layers';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for "Svelte review: compiler and reactivity trade-offs".
 * Restated from the essay's pinned snapshot (commit 04c5d8da…) and its
 * boundary table — documented behaviour, not measured outcomes.
 */

/** The compile entry point's pipeline, as the essay describes it (ref 2). */
export const SVELTE_LAYERS: StackLayer[] = [
  {
    id: 'compile-entry',
    title: 'compile() entry point',
    summary: 'Validates component options and parses the source.',
    facts: ['The compiler pipeline is visible in the public compile entry point.'],
  },
  {
    id: 'analyze',
    title: 'analyze_component',
    summary: 'Analyzes the parsed component.',
    facts: ['Diagnostics belong in the development workflow, not after it.'],
  },
  {
    id: 'transform',
    title: 'transform_component',
    summary: 'Transforms the analyzed component into output.',
    facts: ['Observable entry-point calls are not proof all work happens at build time.'],
  },
  {
    id: 'compile-module',
    title: 'compileModule (separate path)',
    summary: 'Analyzes and transforms JavaScript containing runes.',
    facts: ['A separate entry point for modules, not components.'],
  },
];

/** The essay's boundary table, verbatim in substance, sortable by boundary. */
export const SVELTE_BOUNDARY_COLUMNS: MatrixColumn[] = [
  { key: 'behaviour', label: 'Documented behaviour' },
  { key: 'implication', label: 'Review implication' },
];

export const SVELTE_BOUNDARY_ROWS: MatrixRow[] = [
  { label: 'Component source', cells: { behaviour: 'Parse, analyze, transform pipeline', implication: 'Compiler diagnostics belong in the development workflow' } },
  { label: 'Simple object state', cells: { behaviour: 'Deep proxy, recursively applied', implication: 'Review object identity and library integration' } },
  { label: 'Destructured property', cells: { behaviour: 'Value captured at destructuring', implication: 'Check whether a live value was intended' } },
  { label: 'Browser effect', cells: { behaviour: 'Not executed during SSR', implication: 'Do not rely on it for server-rendered data' } },
];

/** The decision checkpoint, as switches the reader can audit. */
export const SVELTE_ADOPTION_ASSUMPTIONS: Assumption[] = [
  { id: 'boundary', label: 'The team can explain one object-boundary bug', note: 'the decision checkpoint\u2019s first test' },
  { id: 'cleanup', label: 'The team can explain one effect-cleanup case', note: 'the decision checkpoint\u2019s second test' },
  { id: 'license', label: 'The root license terms have been read', note: 'MIT-style; does not cover every dependency\u2019s terms' },
  { id: 'speed-only', label: 'The justification is only “compiled means faster”', note: 'the review recommends postponing on this basis alone' },
];

export const SVELTE_ADOPTION_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Migration readiness',
    base: 0,
    unit: 'of checkpoint',
    betterWhen: 'higher',
    deltas: { boundary: 40, cleanup: 40, license: 20, 'speed-only': -100 },
  },
  {
    label: 'Speed-claim risk',
    base: 100,
    unit: 'of checkpoint',
    betterWhen: 'lower',
    deltas: { boundary: -30, cleanup: -30, license: -15, 'speed-only': 25 },
  },
];

/** Reactivity-boundary quiz, each answer cited in the essay. */
export const SVELTE_QUIZ: QuizQuestion[] = [
  {
    prompt: 'A destructured $state property: is it a live binding?',
    options: [
      { text: 'Yes — it stays reactive forever', why: 'The documentation warns the opposite.' },
      { text: 'No — it is evaluated at that moment', why: 'Destructured references are captured at destructuring; check whether a live value was intended.', correct: true },
    ],
  },
  {
    prompt: 'Do Svelte effects run during server-side rendering?',
    options: [
      { text: 'No — effects are browser-only', why: 'The effect guide states they do not run during SSR; do not rely on them for server-rendered data.', correct: true },
      { text: 'Yes — they establish server-rendered data', why: 'That reliance is exactly the boundary the documentation rules out.' },
    ],
  },
  {
    prompt: 'Does $state\u2019s deep proxy wrap class instances automatically?',
    options: [
      { text: 'No — proxying stops at a different object kind; classes are excluded', why: 'The $state documentation specifically excludes automatic proxying of class instances.', correct: true },
      { text: 'Yes — everything is deeply proxied', why: 'The recursion applies until a different object kind is encountered; class instances are named as excluded.' },
    ],
  },
];

export const SVELTE_FIGURES = [
  { mdxName: 'LayerStack', archetype: 'accordion-layer-stack' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
