import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { design } from '@/src/design';
import { renderDesign, validateDesign, geometry, contrastMeasurements } from '@/scripts/design/system';
import { lintSource, lintMotion, runLint } from '@/scripts/design/lint';
import HomePage from '@/app/page';
import HomeHero from '@/components/post/HomeHero';
import { slots } from '@/src/generated/slots';

const clone = () => JSON.parse(JSON.stringify(design));

describe('reme v4 manifest and generator', () => {
  it('is deeply frozen and validates', () => {
    expect(Object.isFrozen(design.color.roles)).toBe(true);
    expect(() => validateDesign()).not.toThrow();
  });
  it('rejects malformed module data with an offending schema path', () => {
    const d = clone(); delete d.layout['hero.text'].xs;
    expect(() => validateDesign(d)).toThrow(/xs/);
  });
  it('rejects overspans, missing primitive references and missing empty translations', () => {
    const a = clone(); a.layout['hero.text'].lg = 6;
    expect(() => validateDesign(a)).toThrow(/I2/);
    const b = clone(); b.section[0].slots[0].primitive = 'unknown';
    expect(() => validateDesign(b)).toThrow(/I9/);
    const c = clone(); delete c.locales.bn['topics.empty'];
    expect(() => validateDesign(c)).toThrow(/I10/);
  });
  it('rejects token capability escapes and unknown token names', () => {
    const a = clone(); a.primitive.control.capabilities = ['border'];
    expect(() => validateDesign(a)).toThrow(/I8/);
    const b = clone(); b.primitive.control.variants.primary.bg = 'mystery';
    expect(() => validateDesign(b)).toThrow(/I8/);
  });
  it('rejects color-only status and undersized interactions', () => {
    const a = clone(); a.color.status.verified.icon = '';
    expect(() => validateDesign(a)).toThrow();
    const b = clone(); b.primitive.control.minTarget = 40;
    expect(() => validateDesign(b)).toThrow(/I17/);
  });
  it('keeps approved heading caps and reading measures without relaxing contrast', () => {
    expect(design.type.roles.h1.measureCh).toBe(24);
    expect(design.type.roles.h2.measureCh).toBe(32);
    expect(design.type.roles.h3.measureCh).toBe(34);
    const a = clone(); a.type.roles.body.measureCh = 40;
    expect(() => validateDesign(a)).toThrow(/I4/);
    const b = clone(); b.color.pairs[0].min = 4.5;
    expect(() => validateDesign(b)).toThrow(/threshold was relaxed/);
    const c = clone(); c.color.roles['text-ink'].light = c.color.roles['bg-canvas'].light;
    expect(() => validateDesign(c)).toThrow(/I3/);
  });
  it('proves each declared contrast pair in both themes, including more-contrast', () => {
    const measurements = contrastMeasurements();
    expect(new Set(measurements.map(m => m.mode)).size).toBe(4);
    for (const m of measurements) expect(m.ratio, `${m.mode} ${m.fg}/${m.bg}`).toBeGreaterThanOrEqual(m.threshold);
  });
  it('serializes contrast at stable precision without rounding validation inputs', () => {
    const raw = contrastMeasurements();
    const fixture = JSON.parse(renderDesign()['src/generated/fixtures/contrast.json']);
    expect(fixture).toEqual(raw.map(m => ({ ...m, ratio: Number(m.ratio.toFixed(10)) })));
    expect(raw.some((m, i) => m.ratio !== fixture[i].ratio)).toBe(true);
    for (const [i, m] of raw.entries()) {
      expect(Math.abs(m.ratio - fixture[i].ratio)).toBeLessThanOrEqual(5.1e-11);
      expect(m.ratio).toBeGreaterThanOrEqual(m.threshold);
    }
    // This rounds to a passing 21:1 in the fixture, but raw validation must fail.
    const nearThreshold = clone();
    nearThreshold.color.roles['text-ink'].light = '#000000';
    nearThreshold.color.roles['bg-canvas'].light = '#ffffff';
    nearThreshold.color.pairs[0].min = 21 + 1e-12;
    expect(() => renderDesign(nearThreshold)).toThrow(/I3/);
  });
  it('proves the corrected grid identities and all published span widths', () => {
    const sizes = geometry();
    const lg = sizes.find(g => g.tier === 'lg')!;
    expect(lg.spans[2]).toBeCloseTo(216, 5);
    expect(lg.spans[4]).toBeCloseTo(381.33333, 4);
    for (const g of sizes) {
      expect(g.columns * g.track + (g.columns - 1) * g.gutter).toBeCloseTo(g.inner, 6);
      g.spans.forEach((width, i) => expect(width).toBeCloseTo((i + 1) * g.track + i * g.gutter, 6));
    }
  });
  it('generates byte-identical artifacts without mutating its input', () => {
    const before = JSON.stringify(design), a = renderDesign(), b = renderDesign();
    expect(a).toEqual(b); expect(JSON.stringify(design)).toBe(before);
    for (const [path, content] of Object.entries(a)) expect(readFileSync(path, 'utf8'), path).toBe(content);
  });
  it('solves the non-monotonic hero scale from the actual slot width', () => {
    const fixture = JSON.parse(renderDesign()['src/generated/fixtures/type.json']) as Array<{ role: string; tier: string; size: number; slotWidth: number; cqi: number }>;
    const h1 = fixture.filter(row => row.role === 'h1');
    expect(h1.find(row => row.tier === 'md')!.size).toBe(44);
    expect(h1.find(row => row.tier === 'lg')!.size).toBe(41);
    for (const row of h1) expect(row.cqi * row.slotWidth / 100).toBeCloseTo(row.size, 4);
  });
  it('keeps every roman and italic face within the unchanged 80KB threshold', () => {
    const bytes = Object.values(design.type.fonts.files).reduce((sum, file) => sum + statSync(join('public', file)).size, 0);
    expect(bytes).toBeLessThanOrEqual(design.type.fonts.maxBytes);
    expect(Object.values(design.type.fonts.files).map(file => basename(file)).sort()).toEqual(readdirSync('public/fonts').filter(file => file.endsWith('.woff2')).sort());
  });
});

describe('generated/authored boundary', () => {
  it('passes the migrated-source lint', () => expect(runLint()).toEqual([]));
  it('rejects raw classes, colors, lengths and inline styles', () => {
    for (const source of [
      '<div className="text-[20px]" />', '<div style={{color: "red"}} />',
      '<div className="bg-blue-600" />', 'const bad = "#123456";', 'const bad = "20px";',
    ]) expect(lintSource(source).length).toBeGreaterThan(0);
    expect(lintSource('<div className="r-card r-flow" />')).toEqual([]);
  });
  it('rejects motion outside no-preference and layout transitions inside it', () => {
    expect(lintMotion('.x { transition: opacity 180ms; }')).not.toEqual([]);
    expect(lintMotion('@media (prefers-reduced-motion: no-preference) { .x { transition: width 180ms; } }')).not.toEqual([]);
    expect(lintMotion('@media (prefers-reduced-motion: no-preference) { .x { transition: opacity 180ms; } }')).toEqual([]);
  });
});

describe('landing SSR contract', () => {
  it('renders every declared section and slot once, in manifest order', () => {
    const html = renderToStaticMarkup(<HomePage />);
    const sections = [...html.matchAll(/data-section="([^"]+)"/g)].map(m => m[1]);
    expect(sections).toEqual(design.section.map(s => s.key));
    const actualSlots = [...html.matchAll(/data-slot="([^"]+)"/g)].map(m => m[1]);
    expect(actualSlots.sort()).toEqual(Object.keys(slots).sort());
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html.match(/<details\b/g)).toHaveLength(4);
    expect(html).not.toContain('skeleton');
    expect(html).not.toContain('/api/dispatch');
    expect(html).toContain('not a generative model');
  });
  it('keeps an honest no-data hero with one h1, a plain archive link, and both slots', () => {
    const html = renderToStaticMarkup(<HomeHero />);
    expect(html).toContain('No articles published yet.');
    expect(html).toContain('href="/blog"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('data-slot="hero.visual"');
  });
});
