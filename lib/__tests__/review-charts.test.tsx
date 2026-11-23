// @vitest-environment jsdom
/** Actual grammar/render checks for all ten source maps; no product benchmark. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import ChartBlock from '@/components/charts/ChartBlock';
import { ResearchChart } from '@/components/charts/ResearchChart';
import { parseChartSpec } from '@/lib/charts/spec';

interface Inventory {
  title: string;
  reviewedCommit: string;
  groups: Array<{ label: string; count: number; files: Array<{ path: string }> }>;
}
const reviews = JSON.parse(readFileSync(resolve('docs/articles/repository-review-batch.json'), 'utf8')).reviews as Array<{ slug: string }>;
const cases = reviews.map(({ slug }) => {
  const markdown = readFileSync(resolve(`docs/articles/${slug}.cms.txt`), 'utf8');
  const source = /```chart\n([\s\S]*?)\n```/.exec(markdown)?.[1];
  if (!source) throw new Error(`Missing chart: ${slug}`);
  const inventory = JSON.parse(readFileSync(resolve(`docs/articles/evidence/${slug}/chart-inventory.json`), 'utf8')) as Inventory;
  return { slug, source, inventory };
});

function parsed(source: string) {
  const result = parseChartSpec(source);
  if (!result.ok) throw new Error(result.error);
  return result.spec;
}

describe('Source-map grammar', () => {
  for (const { slug, source, inventory } of cases) {
    it(`${slug}: parses the exact CMS fence and matches every retained count`, () => {
      const spec = parsed(source);
      expect(spec.type).toBe('bar');
      expect(spec.layout).toBe('vertical');
      expect(spec.yScale).toBe('linear');
      expect(spec.points).toEqual(inventory.groups.map((g) => ({ x: g.label, values: [g.files.length] })));
      expect(spec.caption).toContain('not performance');
    });
  }
  it('rejects unsupported layouts instead of silently drawing a different chart', () => {
    const base = 'title: T\ncaption: C\nGroup: 1';
    expect(parseChartSpec(`type: bar\nlayout: diagonal\n${base}`).ok).toBe(false);
    expect(parseChartSpec(`type: line\nlayout: vertical\n${base}`).ok).toBe(false);
    expect(parsed(`type: bar\n${base}`).layout).toBeUndefined();
  });
});

describe('ChartBlock server/loading data equivalent', () => {
  it('retains every review caption, label, and count without mounting a chart or requiring JavaScript', () => {
    // The repository's unmocked next/dynamic compatibility boundary renders its
    // ssr:false loading component during renderToStaticMarkup. This catches an
    // empty loader regression that a direct ResearchChart SSR test would miss.
    for (const { source, inventory } of cases) {
      const html = renderToStaticMarkup(createElement(ChartBlock, { source }));
      expect(html).toContain('<figure');
      expect(html).toContain('<table');
      expect(html).toContain(inventory.title);
      expect(html).not.toContain('Loading chart');
      for (const group of inventory.groups) {
        expect(html).toContain(group.label);
        expect(html).toContain(`>${group.count.toLocaleString('en')}<`);
      }
    }
  });
  it('keeps neighboring figures independent and escapes chart text', () => {
    const source = 'type: bar\nlayout: vertical\ntitle: <script>not executable</script>\ncaption: Literal text\nA: 7';
    const html = renderToStaticMarkup(createElement('div', null,
      createElement(ChartBlock, { source }),
      createElement(ChartBlock, { source: 'type: bar\ntitle: Other\ncaption: Separate\nB: 19' }),
    ));
    expect(html.match(/<figure/g)).toHaveLength(2);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Other');
    expect(html).toContain('>19<');
  });
});

describe('Horizontal source-map SVGs at narrow width', () => {
  const previousRO = globalThis.ResizeObserver;
  const previousAct = (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    class SizedObserver {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback([{ target, contentRect: { width: 360, height: 540 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = SizedObserver as unknown as typeof ResizeObserver;
  });
  afterAll(() => {
    globalThis.ResizeObserver = previousRO;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = previousAct;
  });
  for (const { slug, source, inventory } of cases) {
    it(`${slug}: draws an unanimated bar plot with visible labels and its data table`, async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      try {
        await act(async () => root.render(createElement(ResearchChart, { spec: parsed(source) })));
        const svg = container.querySelector('svg');
        expect(svg).toBeTruthy();
        const labels = [...container.querySelectorAll('svg text')].map((el) => el.textContent);
        for (const group of inventory.groups) {
          expect(labels).toContain(group.label);
          expect(labels).toContain(String(group.count));
        }
        expect(labels).toContain('0');
        expect(container.querySelector('table')).toBeTruthy();
        expect(container.querySelector('[aria-roledescription]') ?? container.querySelector('[role="application"]')).toBeTruthy();
        expect(svg?.outerHTML).not.toContain('NaN');
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    });
  }
});
