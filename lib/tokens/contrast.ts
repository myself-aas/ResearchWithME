/**
 * WCAG 2.x relative-luminance contrast utilities, shared by the token
 * contrast gate (tokens/scripts/check-contrast.mjs has a JS twin) and tests.
 */

export function relativeLuminance(hex: string): number {
  const c = hex
    .replace('#', '')
    .match(/../g)!
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA thresholds: 4.5:1 normal text, 3:1 large text / UI components. */
export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3.0;

export function meetsAA(fg: string, bg: string, largeText = false): boolean {
  return contrastRatio(fg, bg) >= (largeText ? WCAG_AA_LARGE_TEXT : WCAG_AA_NORMAL_TEXT);
}
