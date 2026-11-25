import { hashSeed, mulberry32 } from '../random';
import type { WipeLayer } from '../wipe';

/**
 * Fixture for the WipeCompare demo on /lab (Constitution Article 3: every
 * library figure ships a fixture and is verifiable in-thread before any post
 * adopts it). Deterministic: the grids come from a seeded PRNG, so the demo
 * renders the same field on the server, in the browser, and in the thread.
 */
function field(seedText: string, rows: number, cols: number, peak: number): number[][] {
  const random = mulberry32(hashSeed(seedText));
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.round(random() * peak * 10) / 10),
  );
}

export const WIPE_COMPARE_FIXTURE = {
  layers: [
    { label: 'Survey — March', values: field('march-survey', 7, 12, 8), tone: 'brand' },
    { label: 'Survey — September', values: field('september-survey', 7, 12, 8), tone: 'emerging' },
  ] as WipeLayer[],
};
