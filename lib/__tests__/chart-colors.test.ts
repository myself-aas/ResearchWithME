import { describe, expect, it } from 'vitest';
import { DARK_CHART_THEME, LIGHT_CHART_THEME, seriesColor } from '@/lib/charts/tokens';
import { semanticDark, semanticLight } from '@/tokens/generated/tokens';

/** sRGB → linear, then relative luminance (WCAG 2.x). */
function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('chart palette', () => {
  it('reads every series colour from the generated tokens', () => {
    const lightSeries = Object.values(semanticLight.chart.series);
    const darkSeries = Object.values(semanticDark.chart.series);
    expect(LIGHT_CHART_THEME.series).toEqual(lightSeries);
    expect(DARK_CHART_THEME.series).toEqual(darkSeries);
    // Seven distinct series, so a multi-series figure never repeats a colour.
    expect(new Set(LIGHT_CHART_THEME.series).size).toBe(7);
    expect(new Set(DARK_CHART_THEME.series).size).toBe(7);
  });

  it('keeps every series legible against its own canvas', () => {
    for (const [theme, canvas, name] of [
      [LIGHT_CHART_THEME, semanticLight.canvas, 'light'],
      [DARK_CHART_THEME, semanticDark.canvas, 'dark'],
    ] as const) {
      for (const colour of theme.series) {
        expect(contrast(colour, canvas), `${name}: ${colour} on ${canvas}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps axis and grid separable from the canvas without shouting', () => {
    // A gridline is structure, not data: it must be visible but stay recessive.
    for (const [theme, canvas] of [
      [LIGHT_CHART_THEME, semanticLight.canvas],
      [DARK_CHART_THEME, semanticDark.canvas],
    ] as const) {
      const grid = contrast(theme.grid, canvas);
      expect(grid).toBeGreaterThan(1.1);
      expect(grid).toBeLessThan(4.5);
      // Axis labels carry meaning and must meet body-text contrast.
      expect(contrast(theme.axis, canvas)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('wraps the palette for more series than colours', () => {
    expect(seriesColor(LIGHT_CHART_THEME, 7)).toBe(LIGHT_CHART_THEME.series[0]);
    expect(seriesColor(LIGHT_CHART_THEME, 3)).toBe(LIGHT_CHART_THEME.series[3]);
  });
});
