import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { OrgNode } from '@/lib/figures/tree';
import type { FlowEdge, FlowNode } from '@/lib/figures/flow';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for "Read a repository before you run it". Facts restated
 * from the essay: history before README, the three signals, the request
 * trace, and what the method buys.
 */

/** The three signals, in reading order (essay §3). */
export const READREPO_SIGNAL_COLUMNS: MatrixColumn[] = [
  { key: 'where', label: 'Where to look' },
  { key: 'tells', label: 'What it tells you' },
];

export const READREPO_SIGNAL_ROWS: MatrixRow[] = [
  { label: 'History before README', cells: { where: 'git log, shortlog, commits per month', tells: 'A maintained system or a published snapshot — and how hurried the author was' } },
  { label: 'Test-to-source ratio', cells: { where: 'By directory', tells: 'Where the author\u2019s confidence lives — excellent tests around the parser, none around the network layer' } },
  { label: 'Dependency graph shape', cells: { where: 'Not the count — the shape', tells: 'Runtime dependencies pulling build tools; one package in every layer is a cost you inherit' } },
  { label: 'Error paths', cells: { where: 'The most important public function', tells: 'A raised generic exception means the boundaries are probably not designed yet' } },
];

/** The repository as a structure of reads (essay §§2–5); counts are the essay\u2019s claims, not invented metrics. */
export const READREPO_TREE: OrgNode[] = [
  {
    id: 'repo',
    label: 'The repository, read before running',
    role: 'about forty minutes, before the install command',
    children: [
      {
        id: 'history',
        label: 'Git history',
        role: 'an honest document; read its shape',
        children: [
          { id: 'tempo', label: 'Commits per month', role: 'one author and forty commits last month ≠ nine authors and a burst three years ago — different kinds of trust' },
          { id: 'reverts', label: 'Reverts and hotfixes', role: 'where the design pushed back; no reverts at all often means no users' },
        ],
      },
      {
        id: 'signals',
        label: 'Three signals',
        role: 'stop as soon as one fails badly',
        children: [
          { id: 'tests', label: 'Tests by directory', role: 'the parser is tested; the network layer is where confidence ends' },
          { id: 'deps', label: 'Dependency graph', role: 'shape over count; the package in every layer' },
          { id: 'errors', label: 'Error paths', role: 'what happens when the important function fails' },
        ],
      },
      {
        id: 'request',
        label: 'One request, end to end',
        role: 'entry point → write → return',
        children: [
          { id: 'scratch', label: 'The three-column scratch file', role: 'module, input, output — same object in and out marks an adapter or a stopped decision' },
        ],
      },
      {
        id: 'readme',
        label: 'README, last',
        role: 'a claim to check against what you found',
      },
    ],
  },
];

/** One request traced end to end (essay §4). */
export const READREPO_REQUEST_NODES: FlowNode[] = [
  { id: 'entry', label: 'Entry point', x: 10, y: 50, kind: 'start', note: 'not a mock, not a unit test — the actual entry point' },
  { id: 'module', label: 'Module', x: 37, y: 28, kind: 'step', note: 'input and output the same object? mark it — adapter, or design that stopped making decisions' },
  { id: 'write', label: 'Whatever it writes', x: 63, y: 72, kind: 'step', note: 'down to the storage layer' },
  { id: 'return', label: 'Whatever it returns', x: 88, y: 44, kind: 'end', note: 'back up — this is where "it looked clean" falls apart' },
];

export const READREPO_REQUEST_EDGES: FlowEdge[] = [
  { from: 'entry', to: 'module', label: 'call' },
  { from: 'module', to: 'write', label: 'the same dictionary, five names' },
  { from: 'write', to: 'return' },
];

export const READREPO_REQUEST_PATH = ['entry', 'module', 'write', 'return'];

export const READREPO_QUIZ: QuizQuestion[] = [
  {
    prompt: 'What do you read first?',
    options: [
      { text: 'The README', why: 'Last — as a claim to check against what you found.' },
      { text: 'The git history', why: 'It records what changed, in what order, and how hurried the author was — an honest document.', correct: true },
    ],
  },
  {
    prompt: 'A project with no revert commits at all is often:',
    options: [
      { text: 'A project with no users', why: 'Revert commits tell you where the design pushed back.', correct: true },
      { text: 'A project with a very stable design', why: 'That is the flattering reading; the callout offers the less flattering one.' },
    ],
  },
  {
    prompt: 'A module whose input and output are the same object is usually:',
    options: [
      { text: 'An adapter, or a place where the design has stopped making decisions', why: 'Both are useful to know before you depend on the project.', correct: true },
      { text: 'Proof of clean layering', why: 'Layers that read well in isolation often pass one dictionary through six modules under five names.' },
    ],
  },
  {
    prompt: 'Does reading history and tests tell you the code is safe to run?',
    options: [
      { text: 'Yes — that is the point of the method', why: 'The warning callout is explicit that this is not a security audit.' },
      { text: 'No — give the security pass its own time', why: 'Reading tells you about design and maintenance; the two activities are separate.', correct: true },
    ],
  },
];

export const READREPO_FIGURES = [
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'OrgChart', archetype: 'tree-expand-org' },
  { mdxName: 'FlowDiagram', archetype: 'flow-diagram-trace' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
];
