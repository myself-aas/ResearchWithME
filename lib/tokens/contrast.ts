/**
 * WCAG 2.x relative-luminance contrast utilities, shared by the token
 * contrast gate (tokens/scripts/check-contrast.mjs has a JS twin) and tests.
 * Supports both #RRGGBB hex and rgba(r, g, b, a) composited over a backdrop.
 */

const RGBA_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const parts = full.match(/../g);
  if (!parts || parts.length < 3) throw new Error(`Invalid hex color: ${hex}`);
  return [parseInt(parts[0], 16), parseInt(parts[1], 16), parseInt(parts[2], 16)];
}

export function compositeOverHex(color: string, backdropHex = '#FAF9F6'): string {
  const trimmed = color.trim();
  const match = trimmed.match(RGBA_RE);
  if (!match) return trimmed;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] !== undefined ? Math.min(1, Math.max(0, Number(match[4]))) : 1;
  const [br, bg, bb] = hexToRgb(backdropHex);
  const blend = (fg: number, back: number) => Math.round(fg * a + back * (1 - a));
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(blend(r, br))}${toHex(blend(g, bg))}${toHex(blend(b, bb))}`;
}

export function relativeLuminance(color: string, backdropHex = '#FAF9F6'): number {
  const hex = compositeOverHex(color, backdropHex);
  const c = hexToRgb(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(a: string, b: string): number {
  const resolvedBg = compositeOverHex(b, '#FAF9F6');
  const resolvedFg = compositeOverHex(a, resolvedBg);
  const [hi, lo] = [relativeLuminance(resolvedFg, resolvedBg), relativeLuminance(resolvedBg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA thresholds: 4.5:1 normal text, 3:1 large text / UI components. */
export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3.0;

export function meetsAA(fg: string, bg: string, largeText = false): boolean {
  return contrastRatio(fg, bg) >= (largeText ? WCAG_AA_LARGE_TEXT : WCAG_AA_NORMAL_TEXT);
}
