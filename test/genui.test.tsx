import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { design } from '@/src/design';
import { parseResearchTree, GenUIValidationError, safeHref, widgetSchemas } from '@/lib/assistant/genui-schema';
import { researchWidgets } from '@/lib/assistant/genui-fixtures';
import { ResearchUI, remeGenUICatalog } from '@/components/assistant/reme-catalog';
import { contrastMeasurements, validateDesign } from '@/scripts/design/system';
import { probeLocalCapabilities } from '@/lib/assistant/local-capabilities';

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : T[K] extends number ? number : T[K] };
const empty = { component: 'RemeEmptyState', props: { message: 'No results.' } };
describe('v4.1 strict research catalog', () => {
  it('has exactly the manifest allowlist, with actual upstream catalog implementations', () => {
    expect(Object.keys(widgetSchemas)).toEqual([...design.genui.allowlist]);
    expect(Object.keys(remeGenUICatalog.components).sort()).toEqual([...design.genui.allowlist].sort());
    expect(Object.keys(design.primitive)).toHaveLength(13);
  });
  it('validates and server-renders all nine fixtures without styles or scripts', () => {
    for (const node of researchWidgets) {
      expect(() => parseResearchTree(node)).not.toThrow();
      const html = renderToStaticMarkup(<ResearchUI value={node} />);
      expect(html).not.toContain('could not be verified');
      expect(html).not.toMatch(/style=|<script|<iframe/);
    }
  });
  it.each(['div', 'script', '__proto__', 'constructor', 'HTML', 'RemeUnknown'])('rejects unknown %s before rendering', component => {
    expect(() => parseResearchTree({ component, props: {} })).toThrow(GenUIValidationError);
    const html = renderToStaticMarkup(<ResearchUI value={{ component, props: {} }} />);
    expect(html).toContain('could not be verified');
    expect(html).not.toContain('<script');
  });
  it('rejects HTML, CSS, events, expressions and raw props even under an allowed name', () => {
    for (const extra of [{ style: { color: 'red' } }, { className: 'escape' }, { onClick: 'evil()' }, { dangerouslySetInnerHTML: { __html: '<img src=x onerror=evil()>' } }, { message: { $state: '/secret' } }]) {
      expect(() => parseResearchTree({ ...empty, props: { ...empty.props, ...extra } })).toThrow(GenUIValidationError);
    }
    expect(() => parseResearchTree({ ...empty, children: [empty] })).toThrow(GenUIValidationError);
    expect(() => parseResearchTree({ ...empty, on: { load: 'eval' } })).toThrow(GenUIValidationError);
  });
  it('escapes text instead of interpreting HTML', () => {
    const html = renderToStaticMarkup(<ResearchUI value={{ ...empty, props: { message: '<script>alert(1)</script>' } }} />);
    expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
  });
  it('bounds depth, node count, cycles, strings and row cardinality', () => {
    let tree: unknown = empty;
    for (let i = 0; i < 9; i++) tree = { component: 'RemeStack', props: {}, children: [tree] };
    expect(() => parseResearchTree(tree)).toThrow(/size limit/);
    expect(() => parseResearchTree({ component: 'RemeStack', props: {}, children: Array(81).fill(empty) })).toThrow(/size limit/);
    const cyclic = { component: 'RemeStack', props: {}, children: [] as unknown[] }; cyclic.children.push(cyclic);
    expect(() => parseResearchTree(cyclic)).toThrow(/Cyclic/);
    expect(() => parseResearchTree({ ...empty, props: { message: 'a'.repeat(4001) } })).toThrow();
    expect(() => parseResearchTree({ component: 'RemeMetricTable', props: { caption: 'Bad', columns: ['A', 'B'], rows: [['Only one']] } })).toThrow();
  });
  it('allows only safe research destinations', () => {
    for (const url of ['/search', '/blog/example', 'https://doi.org/10.1000/example']) expect(safeHref.safeParse(url).success).toBe(true);
    for (const url of ['javascript:alert(1)', '//evil.test', '/\\evil.test', 'https://evil.test', 'https://evil@doi.org/test', 'data:text/html,hello', '/\nevil']) expect(safeHref.safeParse(url).success).toBe(false);
  });
  it('rejects out-of-range percent values and preserves zero uncertainty with a full scale', () => {
    const node = { component: 'RemeBenchmarkChart', props: { title: 'Fixture', unit: '%', items: [{ label: 'A', value: 100, sd: 0 }] } };
    const html = renderToStaticMarkup(<ResearchUI value={node} />);
    expect(html).toContain('0–100%'); expect(html).toContain('<td>0</td>');
    expect(() => parseResearchTree({ ...node, props: { ...node.props, items: [{ label: 'A', value: 101 }] } })).toThrow();
  });
  it('uses calm reserved live text while a whole spec is incomplete', () => {
    const html = renderToStaticMarkup(<ResearchUI value={{ component: 'script' }} streaming />);
    expect(html).toContain('aria-live="polite"'); expect(html).toContain('Preparing the research view');
    expect(html).not.toContain('skeleton'); expect(html).not.toContain('<script');
  });
});

describe('v4.1 manifest invariants', () => {
  it('measures derived states, disabled text and marked text across four modes', () => {
    const rows = contrastMeasurements();
    for (const state of ['surfaceHover', 'surfaceActive', 'primaryHover', 'primaryActive', 'selected']) expect(rows.filter(row => row.bg === state).length).toBeGreaterThanOrEqual(8);
    for (const row of rows) expect(row.ratio).toBeGreaterThanOrEqual(row.threshold);
    expect(rows.some(row => row.fg === 'text-disabled' && row.threshold === 4.5)).toBe(true);
    const bad = JSON.parse(JSON.stringify(design)); bad.color.states.primaryActive = .9;
    expect(() => validateDesign(bad)).toThrow(/I3/);
  });
  it('rejects invalid heading bands, placement, GenUI gaps and relaxed model budgets', () => {
    for (const mutate of [
      (d: Mutable<typeof design>) => { d.type.roles.h1.measureCh = 41; },
      (d: Mutable<typeof design>) => { d.placement['article.body'].start = 9; },
      (d: Mutable<typeof design>) => { d.genui.surface.gap = 7; },
      (d: Mutable<typeof design>) => { d.genui.model.maxBytes = 150000001; },
    ]) {
      const bad = JSON.parse(JSON.stringify(design)); mutate(bad);
      expect(() => validateDesign(bad)).toThrow();
    }
  });
  it('does not claim a model is installed or probe browser APIs on the server', async () => {
    expect(design.genui.model.available).toBe(false);
    await expect(probeLocalCapabilities()).resolves.toEqual({ supported: false, backend: 'none', crossOriginIsolated: false });
  });
});
