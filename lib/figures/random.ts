/**
 * The only sanctioned source of randomness in the figure library.
 *
 * Constitution Article 9: a figure must render identically on the server and
 * the client, so nothing in `components/library/` may call `Math.random()` or
 * `Date.now()`. Everything unpredictable comes from a seeded PRNG whose seed
 * is a prop, a constant, or an explicit user action — which also makes every
 * figure reproducible in tests and in the assistant thread.
 */

/** Small, fast, seedable PRNG returning values in [0, 1). Deterministic. */
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

/** Derive a numeric seed from any string, so fixtures can seed by name. */
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
