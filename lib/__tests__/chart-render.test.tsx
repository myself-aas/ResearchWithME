// @vitest-environment jsdom
/**
 * Chart rendering contract.
 *
 * Follows the repo convention (see `branding-header.test.tsx`): no testing
 * library, just `renderToStaticMarkup` for the synchronous parts and a real
 * `createRoot` for the mounted interactive plot.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { ResearchChart } from '@/components/charts/ResearchChart';
import { LIGHT_CHART_THEME } from '@/lib/charts/tokens';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseChartSpec } from '@/lib/charts/spec';

// `ChartBlock` lazy-loads the recharts plot. Resolve it synchronously here so the
// figure is assertable; the lazy boundary itself is covered by the bundle check.
vi.mock('next/dynamic', () => ({
  default: () => (props: { spec: Parameters<typeof ResearchChart>[0]['spec']; showTable?: boolean }) =>
    createElement(ResearchChart, props),
}));
import { ChartDataTable } from '@/components/charts/ChartDataTable';
import ChartBlock from '@/components/charts/ChartBlock';

const SPEC = `type: line
title: Citations per year
caption: Peer-reviewed articles are cited more often than preprints.
x: Year
y: Citations
series: Peer-reviewed, Preprints
2019: 120, 40
2020: 310, nil
2021: 480, 210`;

function spec() {
  const result = parseChartSpec(SPEC);
  if (!result.ok) throw new Error(result.error);
  return result.spec;
}

describe('ChartDataTable', () => {
  const html = renderToStaticMarkup(createElement(ChartDataTable, { spec: spec() }));

  it('renders a table with one column per series', () => {
    expect(html).toContain('<table');
    expect(html).toContain('Peer-reviewed');
    expect(html).toContain('Preprints');
    expect(html).toContain('2019');
    expect(html).toContain('2021');
    // Header cells are scoped, so a screen reader can associate them.
    expect(html).toMatch(/<th scope="col"/);
    expect(html).toMatch(/<th scope="row"/);
  });

  it('labels a missing value rather than plotting it as zero', () => {
    expect(html).toContain('Not reported');
    // Exactly one cell is missing in this spec (2020 / Preprints).
    expect(html.match(/Not reported/g)).toHaveLength(1);
  });

  it('describes itself through a caption and the author notes', () => {
    expect(html).toContain('Citations per year');
    expect(html).toContain('data table');
    const withNotes = parseChartSpec(`${SPEC}\nnotes: n = 42.`);
    if (!withNotes.ok) throw new Error(withNotes.error);
    expect(renderToStaticMarkup(createElement(ChartDataTable, { spec: withNotes.spec }))).toContain('n = 42.');
  });
});

describe('ResearchChart plot', () => {
  // jsdom has no layout engine, so ResponsiveContainer would measure zero and
  // render nothing. Feed it a size to prove the SVG is actually produced and
  // painted with token colours — otherwise a "figure renders" test passes on the
  // wrapper alone while the plot is blank.
  const RealRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  beforeAll(() => {
    class TestResizeObserver {
      constructor(private readonly cb: (entries: Array<{ target: Element; contentRect: { width: number; height: number } }>) => void) {}
      observe(target: Element) {
        this.cb([{ target, contentRect: { width: 640, height: 320 } }]);
      }
      unobserve() {}
      disconnect() {}
    }
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = TestResizeObserver;
  });
  afterAll(() => {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = RealRO;
  });

  it('draws an SVG painted with the chart token palette', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(ResearchChart, { spec: spec() }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // Axis ticks are real text, so the chart is not a decorative image.
    expect(container.querySelectorAll('svg text').length).toBeGreaterThan(2);

    const fills = [...container.querySelectorAll('svg [fill]')]
      .map((node) => node.getAttribute('fill'))
      .filter((fill): fill is string => Boolean(fill && /^#[0-9A-Fa-f]{6}$/.test(fill)));
    // Series 1 is the first palette entry: proof the colours come from tokens.
    expect(fills).toContain(LIGHT_CHART_THEME.series[0]);

    act(() => root.unmount());
    container.remove();
  });
});

describe('ChartBlock', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('preserves the author text and names the fault when a spec is invalid', () => {
    const html = renderToStaticMarkup(
      createElement(ChartBlock, { source: 'type: pie\ntitle: T\ncaption: C\n2020: 1' }),
    );
    expect(html).toContain('This chart could not be drawn');
    expect(html).toContain('must be one of');
    // The spec is echoed back so nothing the author typed is lost.
    expect(html).toContain('type: pie');
  });

  it('renders a figure with an accessible name, its table, and scale disclosure', async () => {
    await act(async () => {
      root.render(createElement(ChartBlock, { source: SPEC }));
    });
    // The dynamic import resolves once recharts has loaded.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    const figure = container.querySelector('figure[data-chart]');
    expect(figure).toBeTruthy();
    expect(figure?.textContent).toContain('Citations per year');
    expect(figure?.textContent).toContain('cited more often than preprints');
    // §32: the accessible equivalent must always be present.
    expect(figure?.querySelector('table')).toBeTruthy();
    // The plot is marked as decorative-only for print/forced-colors purposes.
    expect(figure?.querySelector('[data-ui-only]')).toBeTruthy();
  });

  it('discloses a logarithmic axis in text, not just in the tick spacing', async () => {
    const logSpec = `type: line\ntitle: Growth\ncaption: It compounds.\ny-scale: log\n2020: 1\n2021: 100`;
    await act(async () => {
      root.render(createElement(ChartBlock, { source: logSpec }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    expect(container.querySelector('figure')?.textContent).toContain('logarithmic');
  });
});

describe('MarkdownBody integration', () => {
  it('turns a ```chart fence into a figure and leaves ordinary code blocks alone', async () => {
    const { default: MarkdownBody } = await import('@/components/MarkdownBody');
    const markdown = [
      'Prose before the figure.',
      '',
      '```chart',
      'type: bar',
      'title: Sample sizes',
      'caption: Cohort grew year on year.',
      'series: Enrolled, Completed',
      '2022: 120, 90',
      '2023: 260, nil',
      '```',
      '',
      '```js',
      'const x = 1;',
      '```',
    ].join('\n');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(MarkdownBody, { markdown }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    const figure = container.querySelector('figure[data-chart]');
    expect(figure).toBeTruthy();
    expect(figure?.querySelector('figcaption')?.textContent).toContain('Sample sizes');
    // §32: the data table travels with the figure.
    expect(figure?.querySelector('table')).toBeTruthy();
    expect(figure?.textContent).toContain('Not reported');
    // A normal fenced block is still code, not a chart.
    expect(container.querySelector('pre code')?.textContent).toContain('const x = 1');

    act(() => root.unmount());
    container.remove();
  });
});
