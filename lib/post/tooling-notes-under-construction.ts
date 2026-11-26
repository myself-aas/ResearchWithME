import type { StackLayer } from '@/lib/figures/layers';
import type { FlowEdge, FlowNode } from '@/lib/figures/flow';
import type { OrgNode } from '@/lib/figures/tree';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for "Tooling notes, still under construction". Facts restated
 * from the draft itself: the list so far, the publish rule, and the
 * sections still to write.
 */

/** The list so far (essay §"The list so far"), as layers. */
export const TOOLS_LIST_LAYERS: StackLayer[] = [
  {
    id: 'history',
    title: 'A pinned shell history',
    summary: 'So a command from two years ago still runs.',
    facts: [
      'The reason is stated in one line: reproducibility of your own past commands.',
      'Boring on purpose — the draft\u2019s thesis for the whole list.',
    ],
  },
  {
    id: 'scratch',
    title: 'One scratch repository per long read',
    summary: 'With the harness committed beside the notes.',
    facts: [
      'The harness and the notes travel together — one clone to rerun a read.',
    ],
  },
  {
    id: 'diff',
    title: 'A diff viewer I actually like',
    summary: 'This matters more than it should.',
    facts: [
      'The draft says so outright — and it is the only tool given that admission.',
    ],
  },
];

/** The workflow the tools serve, as a trace. */
export const TOOLS_WORKFLOW_NODES: FlowNode[] = [
  { id: 'pick', label: 'Pick the thing', x: 10, y: 50, kind: 'start', note: 'a repository or paper worth a long read' },
  { id: 'scratch', label: 'Open a scratch repository', x: 35, y: 30, kind: 'step', note: 'harness committed beside the notes' },
  { id: 'read', label: 'Read and run', x: 60, y: 50, kind: 'step', note: 'commands come from pinned history, so old ones still run' },
  { id: 'diff', label: 'Diff what changed', x: 82, y: 32, kind: 'step', note: 'with the viewer that matters more than it should' },
  { id: 'publish', label: 'Publish the notes', x: 92, y: 72, kind: 'end', note: 'when the first paragraph can state what changed my mind' },
];

export const TOOLS_WORKFLOW_EDGES: FlowEdge[] = [
  { from: 'pick', to: 'scratch' },
  { from: 'scratch', to: 'read' },
  { from: 'read', to: 'diff', label: 'check' },
  { from: 'diff', to: 'publish' },
];

export const TOOLS_WORKFLOW_PATH = ['pick', 'scratch', 'read', 'diff', 'publish'];

/** The draft itself, as a structure (essay §"Still to write"). */
export const TOOLS_DRAFT_TREE: OrgNode[] = [
  {
    id: 'draft',
    label: 'Tooling notes — under construction',
    role: 'a draft that demonstrates draft: true',
    children: [
      {
        id: 'written',
        label: 'Written',
        role: 'the list so far',
        children: [
          { id: 'three', label: 'Three tools', role: 'boring on purpose' },
        ],
      },
      {
        id: 'todo',
        label: 'Still to write',
        role: 'the honest half of the outline',
        children: [
          { id: 'measurement', label: 'Measurement tooling', role: 'the section is not finished' },
          { id: 'editor', label: 'The editor argument', role: 'probably not worth making' },
        ],
      },
      {
        id: 'rule',
        label: 'Publish rule',
        role: 'when the first paragraph can state what changed my mind',
      },
    ],
  },
];

export const TOOLS_QUIZ: QuizQuestion[] = [
  {
    prompt: 'What keeps a command from two years ago runnable?',
    options: [
      { text: 'A pinned shell history', why: 'The first item on the list, for exactly that reason.', correct: true },
      { text: 'A versioned Makefile', why: 'Not in the draft\u2019s list.' },
    ],
  },
  {
    prompt: 'Where does the harness live for a long read?',
    options: [
      { text: 'In the scratch repository, committed beside the notes', why: 'One clone carries both.', correct: true },
      { text: 'In a shared CI cache', why: 'Not what the draft describes.' },
    ],
  },
  {
    prompt: 'Which tool does the draft admit matters more than it should?',
    options: [
      { text: 'The diff viewer', why: '"This matters more than it should" is the draft\u2019s whole justification.', correct: true },
      { text: 'The editor', why: 'The argument about editor choice is probably not worth making.' },
    ],
  },
  {
    prompt: 'When does this draft publish?',
    options: [
      { text: 'When the first paragraph can state what changed my mind', why: 'The draft\u2019s own publish rule.', correct: true },
      { text: 'On a fixed date', why: 'The draft names a condition, not a date.' },
    ],
  },
];

export const TOOLS_FIGURES = [
  { mdxName: 'LayerStack', archetype: 'accordion-layer-stack' },
  { mdxName: 'FlowDiagram', archetype: 'flow-diagram-trace' },
  { mdxName: 'OrgChart', archetype: 'tree-expand-org' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
];
