/**
 * Pseudo-localization — πeme v3.1 §30: at least 35% expansion to catch
 * truncation/overflow before real translations ship.
 */

const PSEUDO_MAP: Record<string, string> = {
  a: 'ȧ', b: 'ƀ', c: 'ƈ', d: 'ḓ', e: 'ḗ', f: 'ƒ', g: 'ğ', h: 'ħ', i: 'ḯ',
  j: 'ĵ', k: 'ķ', l: 'ľ', m: 'ṁ', n: 'ñ', o: 'ő', p: 'ƥ', q: 'ʠ', r: 'ř',
  s: 'ş', t: 'ţ', u: 'ű', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ẏ', z: 'ž',
  A: 'Ȧ', B: 'ß', C: 'Ƈ', D: 'Ḓ', E: 'Ḗ', F: 'Ƒ', G: 'Ğ', H: 'Ħ', I: 'Ḯ',
  J: 'Ĵ', K: 'Ķ', L: 'Ľ', M: 'Ṁ', N: 'Ñ', O: 'Ő', P: 'Ƥ', Q: 'Ɋ', R: 'Ř',
  S: 'Ş', T: 'Ţ', U: 'Ű', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ẏ', Z: 'Ž',
};

/**
 * Pseudo-localize a string: accented glyphs + bracket padding so the result
 * is at least `minExpansion` longer than the source (default 35%).
 */
export function pseudoLocalize(text: string, minExpansion = 0.35): string {
  const mapped = text.replace(/[a-zA-Z]/g, (ch) => PSEUDO_MAP[ch] ?? ch);
  const padTarget = Math.ceil(text.length * minExpansion);
  const padding = '~'.repeat(Math.max(padTarget - (mapped.length - text.length), 0));
  return `[!! ${mapped}${padding} !!]`;
}

export function expansionRatio(original: string, localized: string): number {
  return localized.length / Math.max(original.length, 1);
}
