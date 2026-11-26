import type { PathwayStage } from '@/lib/figures/pathway';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { HotspotPoint } from '@/lib/figures/hotspots';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the OWASP WSTG review (new slug: owasp-wstg-review-how-to-test).
 * Facts restated from the essay's feature/practice/inference table, its
 * reporting section, and the "method, not a security seal" bottom line.
 */

/** The testing pathway the standard structures: discover → validate → report. */
export const WSTG_PATHWAY_STAGES: PathwayStage[] = [
  {
    id: 'scope',
    label: 'Set the scope',
    note: 'stable references are part of the method — pin the version you test against',
    options: [
      { id: 'pin', label: 'Pin the scenario version', detail: 'Versioned scenario naming lets a report reference exactly what was tested.', cost: 0 },
      { id: 'loose', label: 'Reference “the WSTG” loosely', detail: 'The essay\u2019s invalid inference column: not all releases describe the same test.', cost: 1 },
    ],
  },
  {
    id: 'method',
    label: 'Record discovery and validation separately',
    note: 'the passive/active methodology split',
    options: [
      { id: 'passive-active', label: 'Passive first, then active', detail: 'The framework supports recording discovery before validation.', cost: 1 },
      { id: 'active-only', label: 'Jump straight to active testing', detail: 'Reading the guide equals testing is the invalid inference — structure beats enthusiasm.', cost: 2 },
    ],
  },
  {
    id: 'report',
    label: 'Report as an engineering deliverable',
    note: 'the repository\u2019s reporting guidance',
    options: [
      { id: 'evidence', label: 'Preserve scope and reproducible evidence', detail: 'A formatted report proves formatting, not security — evidence is the deliverable.', cost: 1 },
      { id: 'checklist', label: 'Tick the checklist and ship', detail: 'Every team needs one identical sequence is another invalid inference.', cost: 2 },
    ],
  },
];

export const WSTG_FEATURE_COLUMNS: MatrixColumn[] = [
  { key: 'practice', label: 'Useful adoption practice' },
  { key: 'inference', label: 'Invalid inference' },
];

export const WSTG_FEATURE_ROWS: MatrixRow[] = [
  { label: 'Versioned scenario naming', cells: { practice: 'Pin report references', inference: 'All releases describe the same test' } },
  { label: 'Passive/active methodology', cells: { practice: 'Record discovery and validation separately', inference: 'Reading the guide equals testing' } },
  { label: 'Adaptable framework', cells: { practice: 'Assign recurring activity owners', inference: 'Every team needs one identical sequence' } },
  { label: 'Reporting guidance', cells: { practice: 'Preserve scope and reproducible evidence', inference: 'A formatted report proves security' } },
];

/** Anatomy of a test report, per the essay's reporting section. */
export const WSTG_REPORT_PINS: HotspotPoint[] = [
  {
    id: 'scope',
    label: 'Scope',
    detail: 'What was in and out of the test — a report without scope cannot be compared or repeated.',
    x: 16,
    y: 20,
  },
  {
    id: 'scenario',
    label: 'Pinned scenario references',
    detail: 'Versioned scenario naming pins which WSTG release each test came from.',
    x: 44,
    y: 44,
  },
  {
    id: 'evidence',
    label: 'Reproducible evidence',
    detail: 'The deliverable is evidence, not a formatted document; a formatted report proves security is the invalid inference.',
    x: 70,
    y: 30,
  },
  {
    id: 'owner',
    label: 'Recurring activity owners',
    detail: 'The framework is adaptable — assign owners for recurring activity instead of one identical sequence.',
    x: 86,
    y: 70,
  },
];

export const WSTG_QUIZ: QuizQuestion[] = [
  {
    prompt: 'Does reading the OWASP WSTG mean your application has been tested?',
    options: [
      { text: 'Yes — it is a checklist; reading completes it', why: 'Reading the guide equals testing is the table\u2019s own invalid inference.' },
      { text: 'No — use it to structure evidence, not to claim safety', why: 'The review\u2019s bottom line: it is a method, not a security seal.', correct: true },
    ],
  },
  {
    prompt: 'Why pin the WSTG version in a report?',
    options: [
      { text: 'Style — it looks rigorous', why: 'The practice is substance: all releases describing the same test is the invalid inference.' },
      { text: 'Substance — not all releases describe the same test', why: 'Versioned scenario naming lets a report reference exactly what was tested.', correct: true },
    ],
  },
  {
    prompt: 'Does a formatted report prove the application is secure?',
    options: [
      { text: 'Yes — a complete report implies a complete test', why: 'A formatted report proves security is listed as an invalid inference.' },
      { text: 'No — only preserved scope and reproducible evidence carry weight', why: 'Reporting is an engineering deliverable, the essay\u2019s section title.', correct: true },
    ],
  },
];

export const WSTG_FIGURES = [
  { mdxName: 'PathwayMap', archetype: 'route-choice-pathway' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'HotspotAtlas', archetype: 'pinned-hotspot-annotation' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
