import type { ComponentType } from 'react';
import MaskedPatchReconstructor from '@/components/post/MaskedPatchReconstructor';
import SeasonScrubber from '@/components/post/SeasonScrubber';
import CheckpointLadder from '@/components/post/CheckpointLadder';
import PrithviExplorer from '@/components/post/PrithviExplorer';
import { FloodResultsChart, PastisResultsChart } from '@/components/post/PrithviResultsCharts';
import WipeCompare from '@/components/library/WipeCompare';
import TradeoffPad from '@/components/library/TradeoffPad';
import RacePlayback from '@/components/library/RacePlayback';
import LensPeek from '@/components/library/LensPeek';
import HotspotAtlas from '@/components/library/HotspotAtlas';
import AssumptionSwitches from '@/components/library/AssumptionSwitches';
import SelfCheckQuiz from '@/components/library/SelfCheckQuiz';
import {
  ASSUMPTION_SWITCHES_FIXTURE,
  HOTSPOT_ATLAS_FIXTURE,
  LENS_PEEK_FIXTURE,
  RACE_PLAYBACK_FIXTURE,
  SELF_CHECK_QUIZ_FIXTURE,
  TRADEOFF_PAD_FIXTURE,
  WIPE_COMPARE_FIXTURE,
} from './fixtures';

/**
 * The figure registry — the single source of truth for the interactive
 * figure library (FIGURE_CONSTITUTION.md, Articles 1 and 3).
 *
 * One entry per figure carries its generative-UI identity (`toolName`), its
 * uniqueness claim (`archetype`), the component itself, default props that
 * make a bare render meaningful (fixture data for library figures, the
 * article's initial state for adopted ones), and the routing keywords that
 * send an assistant question to it. Everything downstream derives from this
 * list: the MDX component map, `generativeTools.by_name` in the thread, and
 * `routeFigure`. Adding a figure means adding exactly one entry here — the
 * constitution test fails if any of the derived surfaces is hand-forked.
 */

/** Any figure component: all props optional-friendly at the registry seam. */
export type FigureComponent = ComponentType<Record<string, unknown>>;

/**
 * JSON-safe argument values. Tool-call args must satisfy assistant-ui's
 * `ReadonlyJSONObject`, so defaults and routed args are typed as JSON data —
 * which is also Constitution Article 8's serialisability rule.
 */
export type FigureArg = string | number | boolean | null | FigureArg[] | { [key: string]: FigureArg };

export interface FigureDefinition {
  /** Generative-UI tool name (`show_*`), unique across the registry. */
  readonly toolName: string;
  /** MDX tag the article body uses, unique across the registry. */
  readonly mdxName: string;
  /** Human title used on /lab and in tool chrome. */
  readonly title: string;
  /** Declared interaction archetype — duplicates fail the constitution test. */
  readonly archetype: string;
  /** One sentence on what the interaction *does* for the reader. */
  readonly blurb: string;
  /** `library` = fixture-backed, awaiting a post; `adopted` = live in posts. */
  readonly status: 'adopted' | 'library';
  /** True for pre-library figures kept as-is pending migration (§ grandfather clause). */
  readonly legacy?: boolean;
  /** Slugs of the posts that adopt this figure (empty for library status). */
  readonly posts: readonly string[];
  readonly component: FigureComponent;
  /** JSON-serialisable default props; a bare render is always meaningful. */
  readonly defaults: Record<string, FigureArg>;
  /** Lowercase routing keywords; registry order is routing precedence. */
  readonly keywords: readonly string[];
}

const PRITHVI_POST = 'prithvi-eo-2-0-multi-temporal-foundation-model';

export const FIGURES = [
  {
    toolName: 'show_masked_patch_reconstructor',
    mdxName: 'MaskedPatchReconstructor',
    title: 'Masked patch reconstructor',
    archetype: 'ratio-slider-staggered-reveal',
    blurb: 'A ratio slider empties a patch grid, then a staggered reveal reconstructs it — watched training.',
    status: 'adopted',
    posts: [PRITHVI_POST],
    component: MaskedPatchReconstructor as FigureComponent,
    defaults: { initialRatio: 0.75 },
    keywords: ['mask', 'autoencoder', 'mae', 'reconstruct', 'pretrain'],
  },
  {
    toolName: 'show_season_scrubber',
    mdxName: 'SeasonScrubber',
    title: 'Season scrubber',
    archetype: 'time-scrub-field',
    blurb: 'A 12-month scrubber continuously interpolates one illustrated field between sampled keyframes.',
    status: 'adopted',
    posts: [PRITHVI_POST],
    component: SeasonScrubber as FigureComponent,
    defaults: { initialMonth: 5 },
    keywords: ['season', 'seasonal', 'month', 'timeline', 'temporal', 'four dates'],
  },
  {
    toolName: 'show_checkpoint_ladder',
    mdxName: 'CheckpointLadder',
    title: 'Checkpoint ladder',
    archetype: 'listbox-ladder-picker',
    blurb: 'A keyboard-navigable listbox moves an animated ladder marker and re-renders payload cards.',
    status: 'adopted',
    posts: [PRITHVI_POST],
    component: CheckpointLadder as FigureComponent,
    defaults: { initialCheckpoint: '600m-tl' },
    keywords: ['checkpoint', 'gpu', 'parameter', 'model size', 'which model', 'variant'],
  },
  {
    toolName: 'show_prithvi_explorer',
    mdxName: 'PrithviExplorer',
    title: 'Prithvi architecture explorer',
    archetype: 'stage-selector-pipeline',
    blurb: 'A stage selector re-renders the pipeline diagram in place — the legacy pattern the library generalises.',
    status: 'adopted',
    posts: [PRITHVI_POST],
    component: PrithviExplorer as FigureComponent,
    defaults: {},
    keywords: ['architecture', 'pipeline', 'embeddings', 'tokenization'],
  },
  {
    toolName: 'show_flood_results_chart',
    mdxName: 'FloodResultsChart',
    title: 'Sen1Floods11 results chart',
    archetype: 'dataset-switcher-bars',
    blurb: 'A dataset switcher swaps the bar chart in place — the results-viewing pattern.',
    status: 'adopted',
    legacy: true,
    posts: [PRITHVI_POST],
    component: FloodResultsChart as FigureComponent,
    defaults: {},
    keywords: ['sen1floods11', 'flood'],
  },
  {
    toolName: 'show_pastis_results_chart',
    mdxName: 'PastisResultsChart',
    title: 'PASTIS results chart',
    archetype: 'dataset-switcher-bars',
    blurb: 'The same switcher pattern on the PASTIS benchmark (legacy; scheduled for library migration).',
    status: 'adopted',
    legacy: true,
    posts: [PRITHVI_POST],
    component: PastisResultsChart as FigureComponent,
    defaults: {},
    keywords: ['pastis', 'crop segmentation'],
  },
  {
    toolName: 'show_wipe_compare',
    mdxName: 'WipeCompare',
    title: 'Wipe compare',
    archetype: 'drag-wipe-comparison',
    blurb: 'A draggable vertical boundary wipes between two full fields — direct manipulation of a viewport split.',
    status: 'library',
    posts: [],
    component: WipeCompare as FigureComponent,
    defaults: { ...WIPE_COMPARE_FIXTURE },
    keywords: ['wipe', 'before and after', 'compare two', 'boundary', 'side by side'],
  },
  {
    toolName: 'show_tradeoff_pad',
    mdxName: 'TradeoffPad',
    title: 'Trade-off pad',
    archetype: '2d-parameter-drag',
    blurb: 'One draggable point in a 2-D parameter plane; derived outcomes and a budget field recompute live.',
    status: 'library',
    posts: [],
    component: TradeoffPad as FigureComponent,
    defaults: { ...TRADEOFF_PAD_FIXTURE },
    keywords: ['trade-off', 'tradeoff', 'parameter space', 'two dimensions', 'budget'],
  },
  {
    toolName: 'show_race_playback',
    mdxName: 'RacePlayback',
    title: 'Race playback',
    archetype: 'playback-race-series',
    blurb: 'A transport (play/pause/step/speed) replays several ordered series while ranks swap.',
    status: 'library',
    posts: [],
    component: RacePlayback as FigureComponent,
    defaults: { ...RACE_PLAYBACK_FIXTURE },
    keywords: ['race', 'playback', 'over time', 'replay', 'leaderboard'],
  },
  {
    toolName: 'show_lens_peek',
    mdxName: 'LensPeek',
    title: 'Lens peek',
    archetype: 'hover-lens-peek',
    blurb: 'A circular lens follows the pointer and swaps the layer inside it — local inspection, not global split.',
    status: 'library',
    posts: [],
    component: LensPeek as FigureComponent,
    defaults: { ...LENS_PEEK_FIXTURE },
    keywords: ['lens', 'magnif', 'zoom into', 'inspect', 'peek'],
  },
  {
    toolName: 'show_hotspot_atlas',
    mdxName: 'HotspotAtlas',
    title: 'Hotspot atlas',
    archetype: 'pinned-hotspot-annotation',
    blurb: 'Numbered pins anchored to fixed positions on a scene; activating one opens its annotation card.',
    status: 'library',
    posts: [],
    component: HotspotAtlas as FigureComponent,
    defaults: { ...HOTSPOT_ATLAS_FIXTURE },
    keywords: ['anatomy', 'labelled diagram', 'hotspot', 'annotat', 'read the figure'],
  },
  {
    toolName: 'show_assumption_switches',
    mdxName: 'AssumptionSwitches',
    title: 'Assumption switches',
    archetype: 'toggle-assumption-inference',
    blurb: 'Boolean switches re-derive every outcome from base-plus-delta data — auditing which assumption is worth what.',
    status: 'library',
    posts: [],
    component: AssumptionSwitches as FigureComponent,
    defaults: { ...ASSUMPTION_SWITCHES_FIXTURE },
    keywords: ['assumption', 'sensitivity', 'what if', 'toggle', 'ablat'],
  },
  {
    toolName: 'show_self_check_quiz',
    mdxName: 'SelfCheckQuiz',
    title: 'Self-check quiz',
    archetype: 'answer-reveal-quiz',
    blurb: 'The reader commits to an answer; every option explains itself after the choice, and the score tallies.',
    status: 'library',
    posts: [],
    component: SelfCheckQuiz as FigureComponent,
    defaults: { ...SELF_CHECK_QUIZ_FIXTURE },
    keywords: ['quiz', 'test me', 'check yourself', 'question'],
  },
] as const satisfies readonly FigureDefinition[];

/** Every generative tool name — the assistant's tool contract, derived. */
export type FigureTool = (typeof FIGURES)[number]['toolName'];

export function figureByToolName(toolName: string): FigureDefinition | undefined {
  return FIGURES.find((figure) => figure.toolName === toolName);
}

export function adoptedFigures(): FigureDefinition[] {
  return FIGURES.filter((figure) => figure.status === 'adopted');
}
