import type { HotspotPoint } from '@/lib/figures/hotspots';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { BudgetBucket, BudgetTotals } from '@/lib/figures/budget';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for "Welcome to the new ResearchWithMe". Every number is a
 * real gate from AGENTS.md §9 or a fact from the essay itself; the split
 * shares are illustrative (labelled so in the figure) while the caps are the
 * site's actual budgets.
 */

/** Anatomy of an essay on this site, in reading order. */
export const WELCOME_ANATOMY_PINS: HotspotPoint[] = [
  {
    id: 'title',
    label: 'Title and byline',
    detail: 'One h1 above the cover, a mono byline row with author, date, and reading time — metadata lives in text, not banners.',
    x: 20,
    y: 16,
  },
  {
    id: 'cover',
    label: 'The cover',
    detail: 'A 16/9 frame (21/9 for hero posts) with declared dimensions — no title overlaid on the artwork.',
    x: 50,
    y: 40,
  },
  {
    id: 'toc',
    label: 'Table of contents',
    detail: 'The TOC appears before the body; every heading carries an anchor link (check:site asserts the order).',
    x: 76,
    y: 58,
  },
  {
    id: 'figures',
    label: 'Interactive figures',
    detail: 'Figures from the library render here with real data and are maintained as generative UI in the assistant.',
    x: 34,
    y: 74,
  },
  {
    id: 'twin',
    label: 'The markdown twin',
    detail: 'A link rel=alternate exposes the same essay as text/markdown — the machine-readable representation.',
    x: 84,
    y: 88,
  },
];

/** The definition-of-done gates, as an sortable evidence table. */
export const WELCOME_GATES_COLUMNS: MatrixColumn[] = [
  { key: 'budget', label: 'Budget' },
  { key: 'gate', label: 'How it is held' },
];

export const WELCOME_GATES_ROWS: MatrixRow[] = [
  { label: 'JS per article', cells: { budget: '≤ 100 KB gz page-specific', gate: 'measured and asserted in check:site' } },
  { label: 'JS on /lab', cells: { budget: '≤ 80 KB gz page-specific', gate: 'the whole figure registry, asserted' } },
  { label: 'CSS', cells: { budget: '≤ 50 KB gz', gate: 'one stylesheet, tokens, no component-library CSS' } },
  { label: 'Font families', cells: { budget: '≤ 2 downloaded', gate: 'Newsreader + Inter; mono is the system stack' } },
  { label: 'Third-party scripts', cells: { budget: '0', gate: 'analytics is not worth the LCP' } },
  { label: 'Structured data', cells: { budget: 'every non-error route', gate: 'JSON-LD asserted against the visible page' } },
];

/** Where the §9 page-weight budget goes (caps are real; shares illustrative). */
export const WELCOME_WEIGHT_BUCKETS: BudgetBucket[] = [
  { id: 'html', label: 'HTML', max: 200 },
  { id: 'js', label: 'JavaScript', max: 100 },
  { id: 'css', label: 'CSS', max: 50 },
  { id: 'images', label: 'Images and fonts' },
];

export const WELCOME_WEIGHT_TOTALS: BudgetTotals = { value: 1024, unit: 'KB' };

export const WELCOME_WEIGHT_SHARES = [40, 20, 10, 30];

/** How the site works, as a self-check. */
export const WELCOME_QUIZ: QuizQuestion[] = [
  {
    prompt: 'How is a post published on this site?',
    options: [
      { text: 'Through an admin panel', why: 'There is no admin panel — the essay says so outright.' },
      { text: 'Committing an MDX file and pushing', why: 'Publishing means committing a file; the rebuild regenerates pages, feeds, sitemap, and search index.', correct: true },
    ],
  },
  {
    prompt: 'Where do the interactive figures in the essays come from?',
    options: [
      { text: 'One-off scripts per post', why: 'The constitution forbids per-post scripts; figures come from the governed library.' },
      { text: 'A shared registry, also renderable in the assistant thread', why: 'Every figure is registered once and derived into both the article and the thread.', correct: true },
    ],
  },
  {
    prompt: 'What happens when no cloud URL is set for the assistant?',
    options: [
      { text: 'Nothing leaves your browser — the thread is memory-only', why: 'Unset, the thread dies with the tab; sync is a build-time switch.', correct: true },
      { text: 'The assistant refuses to answer', why: 'Retrieval is local either way; only persistence changes.' },
    ],
  },
];

export const WELCOME_FIGURES = [
  { mdxName: 'HotspotAtlas', archetype: 'pinned-hotspot-annotation' },
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'BudgetSplit', archetype: 'partition-drag-allocation' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
