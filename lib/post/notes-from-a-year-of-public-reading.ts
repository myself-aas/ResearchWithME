import type { FlowEdge, FlowNode } from '@/lib/figures/flow';
import type { PathwayStage } from '@/lib/figures/pathway';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for "Notes from a year of public reading". Facts restated
 * from the essay: the notebook problem, what changed, what did not, and
 * the one-paragraph publish rule.
 */

/** How a note travels when it is written for a reader (essay §§1–2, §5). */
export const NOTES_NOTE_FLOW_NODES: FlowNode[] = [
  { id: 'read', label: 'Read closely', x: 10, y: 50, kind: 'start', note: 'the workflow is unchanged in every way that matters' },
  { id: 'write', label: 'Write for a reader', x: 36, y: 30, kind: 'step', note: 'the missing sentence gets written — writing it is how I discover whether I have it' },
  { id: 'test', label: 'The one-paragraph test', x: 62, y: 50, kind: 'decision', note: 'state what I believed before reading and what I believe now' },
  { id: 'publish', label: 'Publish', x: 88, y: 32, kind: 'end', note: 'the version that survives a second read' },
  { id: 'bookmark', label: 'Draft shelved', x: 88, y: 72, kind: 'end', note: 'identical paragraphs — no post yet, roughly a third of drafts stop here' },
];

export const NOTES_NOTE_FLOW_EDGES: FlowEdge[] = [
  { from: 'read', to: 'write', label: 'capture' },
  { from: 'write', to: 'test', label: 'six months later' },
  { from: 'test', to: 'publish', label: 'the paragraphs differ' },
  { from: 'test', to: 'bookmark', label: 'identical' },
];

export const NOTES_NOTE_FLOW_PATH = ['read', 'write', 'test', 'publish'];

/** The practice, concretely (essay §5): forks a note passes through. */
export const NOTES_PRACTICE_STAGES: PathwayStage[] = [
  {
    id: 'read',
    label: 'Read closely',
    note: 'no fork — this stage is unconditional',
  },
  {
    id: 'audience',
    label: 'Choose the note\u2019s reader',
    options: [
      { id: 'private', label: 'Private shorthand', detail: 'Records that a thought existed without recording the thought; drifts toward "check the ablation — suspicious".', cost: 1 },
      { id: 'public', label: 'A public reader', detail: 'Forces the missing sentence — not because the reader needs it, but because writing it is the test.', cost: 0 },
    ],
  },
  {
    id: 'rule',
    label: 'Apply the one-paragraph rule',
    options: [
      { id: 'differs', label: 'Before ≠ now', detail: 'There is a post.', cost: 0 },
      { id: 'identical', label: 'Before = now', detail: 'No post yet — the draft is not published.', cost: 1 },
    ],
  },
  {
    id: 'carry',
    label: 'Carry open questions between posts',
    note: 'the short list that survives a thread',
  },
];

/** The parts that did not improve (essay §4), acknowledged one by one. */
export const NOTES_COST_ASSUMPTIONS: Assumption[] = [
  { id: 'hedges', label: 'Second-guessing hedged sentences', note: 'I do it more than I should' },
  { id: 'softening', label: 'Softening criticism because the author might read it', note: 'caught myself doing it again' },
  { id: 'tidy', label: 'Publishing the version that makes a cleaner post', note: 'if the interesting part is the caveat, the post leads with the caveat' },
];

export const NOTES_COST_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Conclusions that survive a second read',
    base: 0,
    unit: 'of index',
    betterWhen: 'higher',
    deltas: { hedges: 15, softening: 15, tidy: 30 },
  },
  {
    label: 'Tidiness pressure on findings',
    base: 100,
    unit: 'of index',
    betterWhen: 'lower',
    deltas: { hedges: -20, softening: -30, tidy: -50 },
  },
];

export const NOTES_QUIZ: QuizQuestion[] = [
  {
    prompt: '"Check the ablation — suspicious." Six months later, this line is:',
    options: [
      { text: 'A note', why: 'A note can be understood six months later without the paper open beside it.' },
      { text: 'A bookmark', why: 'It records that I had a thought without recording what the thought was — the essay\u2019s own verdict.', correct: true },
    ],
  },
  {
    prompt: 'When does a thread become a post?',
    options: [
      { text: 'When it reaches any conclusion', why: 'The rule is stricter: the two paragraphs must differ.' },
      { text: 'When one paragraph can state believed-before and believed-now — and they differ', why: 'If the paragraphs are identical, there is no post yet.', correct: true },
    ],
  },
  {
    prompt: 'If the interesting part of the result is the caveat, the post:',
    options: [
      { text: 'Leads with the caveat', why: 'A tidy conclusion that requires the caveat to be true is not a conclusion.', correct: true },
      { text: 'Buries the caveat in a footnote', why: 'That is the tidy-version temptation the essay names as a cost of public writing.' },
    ],
  },
];

export const NOTES_FIGURES = [
  { mdxName: 'FlowDiagram', archetype: 'flow-diagram-trace' },
  { mdxName: 'PathwayMap', archetype: 'route-choice-pathway' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
];
