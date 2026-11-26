import type { PathwayStage } from '@/lib/figures/pathway';
import type { MatrixColumn, MatrixRow } from '@/lib/figures/matrix';
import type { HotspotPoint } from '@/lib/figures/hotspots';
import type { QuizQuestion } from '@/lib/figures/quiz';

/**
 * Figure data for the GTA6 emulator review (new slug:
 * gta6-emulator-review-verify-the-claim). Facts restated from the essay's
 * tracked-file table, evidence-surface table, and key findings — a
 * verification case study, not a product review.
 */

/** The entire inspected tree — four files, real sizes (ref: GitHub). */
export const GTA6_FILES_COLUMNS: MatrixColumn[] = [
  { key: 'size', label: 'Size reported by GitHub', numeric: true },
  { key: 'establishes', label: 'What inspection establishes' },
];

export const GTA6_FILES_ROWS: MatrixRow[] = [
  { label: '`LICENSE`', cells: { size: 1076, establishes: 'MIT license text, not proof of implementation or binary provenance.' } },
  { label: '`README.md`', cells: { size: 8017, establishes: 'Product claims, instructions, sample configuration, and a proposed architecture.' } },
  { label: '`metadata/build_manifest_4670.log`', cells: { size: 152, establishes: 'A short text declaration of build success.' } },
  { label: '`metadata/cache_blob_4670.tmp`', cells: { size: 1592, establishes: 'Text lines labelled `CacheBlock-4670-…`; no inspected shader implementation.' } },
];

/** Anatomy of the claim: the three surfaces and what each leaves unresolved. */
export const GTA6_CLAIM_PINS: HotspotPoint[] = [
  {
    id: 'readme',
    label: 'Pinned README',
    detail: 'Describes a guest execution layer, syscall emulation, Vulkan renderer, shader translator/cache — no matching implementation is present in the reviewed tree.',
    x: 16,
    y: 24,
  },
  {
    id: 'release',
    label: 'v1.0.0 release notes',
    detail: 'Says connect to an available PS5 and stream gameplay to a Windows PC — diverging from the README\u2019s local-emulation story.',
    x: 48,
    y: 52,
  },
  {
    id: 'asset',
    label: 'Release asset metadata',
    detail: 'One ZIP reported as 1,815,299 bytes — contents, behavior, source correspondence and safety were not inspected.',
    x: 78,
    y: 30,
  },
  {
    id: 'manifest',
    label: 'Build manifest',
    detail: 'A build-success statement is not a reproducible build: no build command, no artifact digest.',
    x: 58,
    y: 82,
  },
];

/** The verification pathway the essay models. */
export const GTA6_VERIFY_STAGES: PathwayStage[] = [
  {
    id: 'pin',
    label: 'Pin the commit and release',
    note: 'the pinned tree supplies four tracked files',
    options: [
      { id: 'pin', label: 'Pin commit + tag', detail: 'Findings apply to commit e522fdd… and tag v1.0.0, not a moving branch.', cost: 0 },
      { id: 'main', label: 'Trust the default branch', detail: 'Mutable endpoints change; the retrieval timestamp distinguishes original observations.', cost: 1 },
    ],
  },
  {
    id: 'tree',
    label: 'Inspect the tree before the claim',
    note: 'source is missing from the reviewed tree',
    options: [
      { id: 'tree-first', label: 'Count and read the tracked files', detail: 'None implements an emulator or defines a build.', cost: 0 },
      { id: 'readme-first', label: 'Take the README as the state of the art', detail: 'Documentation-led repository with an unverified emulator claim.', cost: 2 },
    ],
  },
  {
    id: 'claims',
    label: 'Compare the claims',
    note: 'the product descriptions diverge',
    options: [
      { id: 'compare', label: 'Read README against release notes', detail: 'The README describes local emulation; the release notes say the game runs on a real PS5 and streams to the PC.', cost: 0 },
      { id: 'single', label: 'Trust one source only', detail: 'Divergent claims are exactly what verification exists to catch.', cost: 2 },
    ],
  },
  {
    id: 'asset',
    label: 'Decide about the release asset',
    note: 'a ZIP reported as 1,815,299 bytes',
    options: [
      { id: 'no-run', label: 'Do not run unverified binaries', detail: 'Contents, behavior, source correspondence and safety were not inspected by the review; a license label does not authenticate a binary.', cost: 0 },
      { id: 'run', label: 'Download and run it anyway', detail: 'Compatibility and safety remain unverified — no benchmark, gameplay replication, or binary security analysis was performed.', cost: 3 },
    ],
  },
];

export const GTA6_QUIZ: QuizQuestion[] = [
  {
    prompt: 'What does the MIT license label in this repository establish?',
    options: [
      { text: 'That the emulator is real and redistributable', why: 'The essay: the MIT label describes the license text; it does not authenticate a release binary or prove an implementation.' },
      { text: 'The license text only — not implementation or binary provenance', why: 'The 1,076-byte LICENSE is one of four tracked files, none implementing an emulator.', correct: true },
    ],
  },
  {
    prompt: 'The README says local emulation; the release notes say PS5 streaming. What does that divergence indicate?',
    options: [
      { text: 'A documentation bug to ignore', why: 'The essay flags it as a key finding: the product descriptions diverge — exactly what verification catches.' },
      { text: 'Claims that must be reconciled before any trust decision', why: 'Compare the claims is the whole third stage of the verification pathway.', correct: true },
    ],
  },
  {
    prompt: 'Is a build-success line in a 152-byte manifest evidence of a reproducible build?',
    options: [
      { text: 'Yes — it declares success', why: 'A build-success statement is not a reproducible build: no build command, no artifact digest.' },
      { text: 'No — there is neither a build command nor an artifact digest', why: 'The manifest supplies a declaration only; reproducibility needs more than a sentence.', correct: true },
    ],
  },
];

export const GTA6_FIGURES = [
  { mdxName: 'MetricMatrix', archetype: 'column-sort-matrix' },
  { mdxName: 'HotspotAtlas', archetype: 'pinned-hotspot-annotation' },
  { mdxName: 'PathwayMap', archetype: 'route-choice-pathway' },
  { mdxName: 'SelfCheckQuiz', archetype: 'answer-reveal-quiz' },
] as const;
