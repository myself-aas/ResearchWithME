import type { FlowNode, FlowEdge } from '@/lib/figures/flow';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { Assumption, AssumptionOutcome } from '@/lib/figures/assumptions';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the RustDesk review (new slug: rustdesk-review-before-you-deploy).
 * Facts restated from the essay's boundary table, connection-controls
 * section, and build surfaces section.
 */

/** The connection flow, from the essay's discovery/relay section (ref to README map). */
export const RUSTDESK_FLOW_NODES: FlowNode[] = [
  { id: 'client', label: 'Client', x: 12, y: 50, kind: 'start', note: 'the machine you sit at' },
  { id: 'mediator', label: 'Discovery / mediator', x: 42, y: 26, kind: 'step', note: 'README map and mediator excerpt — what was inspected' },
  { id: 'relay', label: 'Relay', x: 68, y: 58, kind: 'decision', note: 'control of the relay is only one boundary' },
  { id: 'endpoint', label: 'Endpoint', x: 90, y: 30, kind: 'end', note: 'consent, unattended policies, privilege behaviour' },
];

export const RUSTDESK_FLOW_EDGES: FlowEdge[] = [
  { from: 'client', to: 'mediator', label: 'find' },
  { from: 'mediator', to: 'relay', label: 'handoff' },
  { from: 'relay', to: 'endpoint', label: 'session' },
];

export const RUSTDESK_BOUNDARY_COLUMNS: MatrixColumn[] = [
  { key: 'inspected', label: 'What was inspected' },
  { key: 'validation', label: 'What still needs validation' },
];

export const RUSTDESK_BOUNDARY_ROWS: MatrixRow[] = [
  { label: 'Discovery and relay', cells: { inspected: 'README map and mediator excerpt', validation: 'Deployed server configuration and topology' } },
  { label: 'Endpoint access', cells: { inspected: 'README use/misuse framing', validation: 'Consent, unattended policies and privilege behavior' } },
  { label: 'Build', cells: { inspected: 'Cargo manifest and Flutter workflow', validation: 'Reproducibility and binary provenance' } },
  { label: 'Platform behavior', cells: { inspected: 'Platform-specific dependencies', validation: 'Screen capture, input and permission behavior on each target OS' } },
];

export const RUSTDESK_AUDIT_ASSUMPTIONS: Assumption[] = [
  { id: 'topology', label: 'Your deployed server configuration and topology are known', note: 'the README map is not your deployment' },
  { id: 'consent', label: 'Consent and unattended-access policies are configured', note: 'endpoint access needs its own validation' },
  { id: 'provenance', label: 'The binary you deploy has provenance you can explain', note: 'a build-success statement is not a reproducible build' },
  { id: 'platform', label: 'Screen capture, input and permissions are tested per target OS', note: 'platform behavior varies by target' },
];

export const RUSTDESK_AUDIT_OUTCOMES: AssumptionOutcome[] = [
  {
    label: 'Deployment audit readiness',
    base: 0,
    unit: 'of checklist',
    betterWhen: 'higher',
    deltas: { topology: 25, consent: 30, provenance: 20, platform: 25 },
  },
  {
    label: 'Unexamined trust',
    base: 100,
    unit: 'of checklist',
    betterWhen: 'lower',
    deltas: { topology: -25, consent: -30, provenance: -20, platform: -25 },
  },
];

export const RUSTDESK_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Does controlling your own relay server settle remote-access trust?',
    options: [
      { text: 'Yes — the relay is the trust boundary', why: 'The review\u2019s bottom line: control of the relay is only one boundary.' },
      { text: 'No — endpoint consent, policies, build provenance and platform behaviour remain', why: 'Each is a boundary row in the essay\u2019s table, each still needing validation.', correct: true },
    ],
  },
  {
    prompt: 'What did the review actually inspect about discovery and relay?',
    options: [
      { text: 'A deployed server configuration', why: 'That is exactly what still needs validation — the review inspected the README map and mediator excerpt.' },
      { text: 'The README map and a mediator code excerpt', why: 'Source-visible controls are narrow; your topology is your own to validate.', correct: true },
    ],
  },
  {
    prompt: 'Is the Cargo manifest plus Flutter workflow proof of a reproducible build?',
    options: [
      { text: 'Yes — the build is defined, therefore reproducible', why: 'Reproducibility and binary provenance are listed as still needing validation.' },
      { text: 'No — build surfaces are defined; reproducibility is unproven', why: 'The essay distinguishes a native application with several build surfaces from provenance evidence.', correct: true },
    ],
  },
];

export const RUSTDESK_FIGURES = [
  { mdxName: 'FlowDiagram', archetype: 'flow-diagram-trace' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'AssumptionSwitches', archetype: 'toggle-assumption-inference' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
