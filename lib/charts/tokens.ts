/**
 * Chart colours for recharts, resolved from the generated token module.
 *
 * recharts draws into SVG attributes (`stroke`, `fill`) in JavaScript, where a
 * CSS custom property is not a value it can read. These are therefore the same
 * numbers the `--reme-chart-*` custom properties publish, read from one place:
 * `tokens/src/semantic-*.json` → `tokens/generated/tokens.ts`. Nothing here is
 * a hand-picked hex, and a palette change reaches the charts without an edit.
 *
 * Palette provenance (DESIGN §32, "qualitative palettes MUST remain
 * distinguishable under common color-vision deficiencies"):
 *   simulated protanopia / deuteranopia / tritanopia, minimum pairwise CIELAB
 *   ΔE — light 13.7, dark 12.4. Every series is at least 4.5:1 against its
 *   canvas so a thin line or small mark stays legible.
 *   `lib/__tests__/chart-colors.test.ts` re-checks this on every run.
 */
import { semanticDark, semanticLight } from '@/tokens/generated/tokens';

export interface ChartTheme {
  axis: string;
  grid: string;
  label: string;
  series: string[];
}

function build(theme: typeof semanticLight | typeof semanticDark): ChartTheme {
  const chart = theme.chart;
  const series = Object.keys(chart.series)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => chart.series[key as keyof typeof chart.series]);
  return { axis: chart.axis, grid: chart.grid, label: chart.label, series };
}

export const LIGHT_CHART_THEME: ChartTheme = build(semanticLight);
export const DARK_CHART_THEME: ChartTheme = build(semanticDark);

/** Series colour by index, wrapping so more than seven series still render. */
export function seriesColor(theme: ChartTheme, index: number): string {
  return theme.series[index % theme.series.length];
}

/** A neutral used for "other"/aggregate when the palette runs out. */
export const CHART_NEUTRAL = LIGHT_CHART_THEME.series[LIGHT_CHART_THEME.series.length - 1];
