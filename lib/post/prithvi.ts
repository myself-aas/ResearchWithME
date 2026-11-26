/**
 * Pure data and deterministic helpers behind the Prithvi-EO-2.0 learning
 * figures — the same source feeds the MDX components on the article and the
 * generative-UI tool renderers inside the assistant thread, so a fact can
 * never disagree between the two surfaces.
 *
 * Every number here traces to the paper (arXiv 2412.02732) or its model card,
 * matching the essay's tables. No React, no DOM: everything is unit-tested.
 */

/** The six released checkpoints, per the essay's "Which checkpoints ship" table. */
export interface CheckpointFact {
  id: string;
  label: string;
  /** Millions of parameters. */
  params: number;
  /** Temporal-location (metadata) variant. */
  tl: boolean;
  /** Reported pretraining GPU-hours, where the paper states one. */
  gpuHours?: number;
  /** The pretraining GPU count the paper reports, where stated. */
  gpus?: number;
  href: string;
  /** What this checkpoint is for, in one line. */
  use: string;
}

export const CHECKPOINTS: CheckpointFact[] = [
  {
    id: 'tiny-tl',
    label: 'tiny-TL',
    params: 5,
    tl: true,
    href: 'https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-tiny-TL',
    use: 'Smoke tests and edge devices; smallest released TL checkpoint.',
  },
  {
    id: '100m-tl',
    label: '100M-TL',
    params: 100,
    tl: true,
    href: 'https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-100M-TL',
    use: 'Same scale as the EO-1.0 predecessor, now with metadata embeddings.',
  },
  {
    id: '300m',
    label: '300M',
    params: 300,
    tl: false,
    gpuHours: 21000,
    gpus: 80,
    href: 'https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-300M',
    use: 'Plain control for the 300M-TL ablation pair.',
  },
  {
    id: '300m-tl',
    label: '300M-TL',
    params: 300,
    tl: true,
    gpuHours: 21000,
    gpus: 80,
    href: 'https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-300M-TL',
    use: 'Metadata-enabled workhorse; fine-tunes on one GPU.',
  },
  {
    id: '600m',
    label: '600M',
    params: 600,
    tl: false,
    gpuHours: 58000,
    gpus: 240,
    href: 'https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-600M',
    use: 'Plain control for the 600M-TL pair.',
  },
  {
    id: '600m-tl',
    label: '600M-TL',
    params: 600,
    tl: true,
    gpuHours: 58000,
    gpus: 240,
    href: 'https://huggingface.co/ibm-nasa-geospatial/Prithvi-EO-2.0-600M-TL',
    use: 'The headline model: global corpus, metadata embeddings, best reported scores.',
  },
];

export function findCheckpoint(id: string): CheckpointFact | undefined {
  return CHECKPOINTS.find((checkpoint) => checkpoint.id === id);
}

/** HLS reflectance band names in the model card's expected order. */
export const HLS_BANDS = ['Blue', 'Green', 'Red', 'Narrow NIR', 'SWIR 1', 'SWIR 2'] as const;

/**
 * Deterministic 32-bit PRNG (mulberry32). The mask has to be reproducible:
 * same ratio and seed, same patches hidden — a "random" mask that reshuffles
 * on every render would make the reconstruction claim untestable.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MaskedGrid {
  /** One entry per patch: true when the patch is masked out. */
  masked: boolean[];
  visibleCount: number;
  maskedCount: number;
}

/**
 * Build the masked-autoencoder's patch mask for a grid: exactly
 * `round(ratio * total)` patches hidden, chosen by the seeded PRNG. Ratio is
 * clamped to [0, 1); a fully masked input has no conditioning signal, and the
 * paper's pretraining ratio is 0.75.
 */
export function buildMask(seed: number, ratio: number, rows: number, cols: number): MaskedGrid {
  const total = rows * cols;
  const clamped = Math.min(Math.max(ratio, 0), 0.95);
  const maskedCount = Math.round(clamped * total);
  const random = mulberry32(seed);
  const order = Array.from({ length: total }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const masked = new Array<boolean>(total).fill(false);
  for (const index of order.slice(0, maskedCount)) masked[index] = true;
  return { masked, visibleCount: total - maskedCount, maskedCount };
}

/**
 * Sequence math for the essay's tokenisation explanation: each frame is cut
 * into 16×16 patches with a temporal patch size of one, so the token sequence
 * is `frames × patchesPerFrame` plus one class/register slot per frame.
 */
export function tokenSequenceLength(frames: number, rows: number, cols: number): number {
  return frames * rows * cols;
}

export interface SeasonFrame {
  month: number;
  /** Month label, e.g. "Mar". */
  label: string;
  /** Interpolated HLS-like colours for the artwork. */
  land: string;
  field: string;
  water: string;
  /** Toy NDVI value for the readout bar (0–1), interpolated, not data. */
  ndvi: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Keyframes for an Iowa-like crop scene across a year (not data — illustration). */
const SEASON_KEYS: Array<{ month: number; land: string; field: string; water: string; ndvi: number }> = [
  { month: 0, land: '#8a9182', field: '#b8a887', water: '#4d6d78', ndvi: 0.22 },
  { month: 3, land: '#7f9a72', field: '#c8b06a', water: '#527b7f', ndvi: 0.45 },
  { month: 6, land: '#6e9b63', field: '#d9b253', water: '#41777e', ndvi: 0.82 },
  { month: 9, land: '#7d8f68', field: '#c4a05f', water: '#48747c', ndvi: 0.55 },
  { month: 11, land: '#87917f', field: '#ab9b78', water: '#4d6d78', ndvi: 0.25 },
];

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[mix(r1, r2), mix(g1, g2), mix(b1, b2)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * The scene state for a given month (0–11), interpolated between the season
 * keyframes. Pure and monotonic in month, so the scrubber feels continuous.
 */
export function seasonFrame(month: number): SeasonFrame {
  const clamped = Math.min(Math.max(month, 0), 11);
  let upper = SEASON_KEYS.findIndex((key) => key.month >= clamped);
  if (upper === -1) upper = SEASON_KEYS.length - 1;
  const lower = Math.max(upper - 1, 0);
  const a = SEASON_KEYS[lower];
  const b = SEASON_KEYS[upper];
  const span = Math.max(b.month - a.month, 1);
  const t = Math.min((clamped - a.month) / span, 1);
  return {
    month: clamped,
    label: MONTH_LABELS[clamped],
    land: lerpColor(a.land, b.land, t),
    field: lerpColor(a.field, b.field, t),
    water: lerpColor(a.water, b.water, t),
    ndvi: lerp(a.ndvi, b.ndvi, t),
  };
}

/** The four pretraining frames the paper samples, as months of the year. */
export const PRETRAINING_MONTHS = [3, 5, 8, 10] as const;
