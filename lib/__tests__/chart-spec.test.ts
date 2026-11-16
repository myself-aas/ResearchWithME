import { describe, expect, it } from 'vitest';
import { isChartLanguage, parseChartSpec } from '@/lib/charts/spec';

const VALID = `type: line
title: Citations per year
caption: Peer-reviewed articles are cited more often than preprints.
x: Year
y: Citations
series: Peer-reviewed, Preprints
2019: 120, 40
2020: 310, 155
2021: 480, 210`;

describe('parseChartSpec', () => {
  it('parses a multi-series spec', () => {
    const result = parseChartSpec(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { spec } = result;
    expect(spec.type).toBe('line');
    expect(spec.title).toBe('Citations per year');
    expect(spec.xLabel).toBe('Year');
    expect(spec.yLabel).toBe('Citations');
    expect(spec.series.map((s) => s.name)).toEqual(['Peer-reviewed', 'Preprints']);
    expect(spec.points).toHaveLength(3);
    expect(spec.points[0]).toEqual({ x: '2019', values: [120, 40] });
    expect(spec.series[0].values).toEqual([120, 310, 480]);
    expect(spec.series[1].values).toEqual([40, 155, 210]);
    expect(spec.yScale).toBe('linear');
  });

  it('defaults to a line chart and a single derived series', () => {
    const result = parseChartSpec(`title: Growth
caption: It doubles.
2020: 10
2021: 20`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.type).toBe('line');
    expect(result.spec.series).toHaveLength(1);
    expect(result.spec.series[0].values).toEqual([10, 20]);
  });

  it('treats missing values as null rather than zero', () => {
    const result = parseChartSpec(`type: bar
title: Waves
caption: One wave has no measurement.
series: A, B
w1: 5, nil
w2: 8, N/A
w3: -, 3`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // DESIGN §32: missing data is labelled, never plotted as zero.
    expect(result.spec.series[0].values).toEqual([5, 8, null]);
    expect(result.spec.series[1].values).toEqual([null, null, 3]);
  });

  it('requires a caption, because it is the text alternative', () => {
    const result = parseChartSpec(`title: No caption\n2020: 1`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/caption/i);
  });

  it('requires a title', () => {
    const result = parseChartSpec(`caption: No title\n2020: 1`);
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown chart type and says which are allowed', () => {
    const result = parseChartSpec(`type: pie
title: T
caption: C
2020: 1`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('pie');
    expect(result.error).toMatch(/line, bar, area, scatter/);
  });

  it('rejects a log scale plotting zero', () => {
    const result = parseChartSpec(`type: line
title: T
caption: C
y-scale: log
2020: 0`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/log/i);
  });

  it('accepts a log scale when every value is positive', () => {
    const result = parseChartSpec(`type: line
title: T
caption: C
y-scale: log
2020: 1
2021: 100`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.yScale).toBe('log');
  });

  it('names the offending line when a row has too many values', () => {
    const result = parseChartSpec(`title: T
caption: C
series: Only
2020: 1, 2`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.line).toBe(4);
    expect(result.error).toMatch(/2 values but only 1 series/);
  });

  it('requires series names when a row has several values', () => {
    const result = parseChartSpec(`title: T
caption: C
2020: 1, 2`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/series:/);
  });

  it('keeps a quoted label containing a comma intact', () => {
    const result = parseChartSpec(`title: T
caption: C
series: "A, Inc", B
"2019, Q1": 1, 2`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.series.map((s) => s.name)).toEqual(['A, Inc', 'B']);
  });

  it('ignores blank lines and comments', () => {
    const result = parseChartSpec(`# a comment
title: T

caption: C

2020: 1
`);
    expect(result.ok).toBe(true);
  });

  it('rejects a line that is not key: value', () => {
    const result = parseChartSpec(`title: T
caption: C
just some prose`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.line).toBe(3);
  });

  it('parses optional notes and uncertainty', () => {
    const result = parseChartSpec(`type: bar
title: T
caption: C
notes: n = 42, 95% CI shown.
uncertainty: 1.5, 2
2020: 10
2021: 12`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.notes).toBe('n = 42, 95% CI shown.');
    expect(result.spec.uncertainty).toEqual([1.5, 2]);
  });

  it('never throws on hostile input', () => {
    for (const input of ['', '\n\n', 'title:', ':::', 'series:', 'a: b, c, d', '2020: 1e400']) {
      expect(() => parseChartSpec(input)).not.toThrow();
    }
  });
});

describe('isChartLanguage', () => {
  it('recognises the fenced language tag', () => {
    expect(isChartLanguage('language-chart')).toBe(true);
    expect(isChartLanguage('language-js')).toBe(false);
    expect(isChartLanguage(undefined)).toBe(false);
  });
});
