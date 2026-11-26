import { surfaceCSS } from './surfaces';
import { z } from 'zod';
import { design, type Design } from '../../src/design';

export const tiers = ['xs', 'md', 'lg', 'xl', '2xl'] as const;
export type Tier = typeof tiers[number];
const positive = z.number().positive();
const span = z.object({ xs: positive.int(), md: positive.int(), lg: positive.int(), xl: positive.int(), '2xl': positive.int() });
const tierNumbers = z.object({ xs: positive, md: positive, lg: positive, xl: positive, '2xl': positive });
const variant = z.record(z.string(), z.union([z.string(), z.number()]));
const schema = z.object({
  meta: z.object({ version: z.literal('4.1'), locales: z.array(z.string()), modes: z.array(z.string()), adaptation: z.string() }),
  color: z.object({
    roles: z.record(z.string(), z.object({ light: z.string().regex(/^#[\da-f]{6}$/i), dark: z.string().regex(/^#[\da-f]{6}$/i) })),
    pairs: z.array(z.object({ fg: z.string(), bg: z.array(z.string()).nonempty(), min: positive, kind: z.enum(['text', 'ui']) })),
    status: z.record(z.string(), z.object({ token: z.string(), icon: z.string().min(1), labelKey: z.string() })),
    states: z.object(Object.fromEntries(['surfaceHover', 'surfaceActive', 'primaryHover', 'primaryActive', 'selected'].map(k => [k, z.number().min(0).max(1)]))),
  }),
  type: z.object({
    remBase: positive,
    families: z.record(z.string(), z.string()),
    roles: z.record(z.string(), z.object({ slot: z.string(), font: z.string(), weight: positive, lh: positive, measureCh: positive, fixed: positive.optional(), min: positive.optional(), max: positive.optional(), targets: tierNumbers.optional() })),
    fonts: z.object({ ranges: z.array(z.tuple([z.number(), z.number()])), files: z.object({ serif: z.string(), sans: z.string(), serifItalic: z.string() }), italicWeight: positive, maxBytes: positive, weightMin: positive, weightMax: positive, opticalSize: positive, glyphs: z.string() }),
    bangla: z.object({ bodyLh: positive, headingLh: positive }),
  }),
  space: z.object({ steps: z.record(z.string(), positive), radius: z.record(z.string(), positive), border: z.record(z.string(), positive), target: positive, focus: z.object({ width: positive, offset: z.number().nonnegative() }), header: positive, icon: positive, sectionGap: tierNumbers, layer: z.record(z.string(), z.number()), landscape: z.object({ maxHeight: positive, visualMaxDvh: positive }) }),
  motion: z.object({ duration: z.record(z.string(), positive), easing: z.record(z.string(), z.string()), allowed: z.array(z.enum(['opacity', 'transform'])) }),
  breakpoint: z.record(z.string(), z.object({ min: z.number().nonnegative(), reference: positive })),
  grid: z.object({ maxInner: positive, tiers: z.record(z.string(), z.object({ columns: positive.int(), gutter: positive, margin: positive })) }),
  primitive: z.record(z.string(), z.object({ capabilities: z.array(z.string()), variants: z.record(z.string(), variant), minTarget: positive.optional(), ratio: z.string().optional(), fallback: z.object({ avif: z.string(), webp: z.string(), alt: z.string() }).optional(), mediaWidth: positive.optional(), mediaHeight: positive.optional(), width: z.string().optional(), sign: z.object({ closed: z.string(), open: z.string() }).optional() })),
  placement: z.record(z.string(), z.object({ start: positive.int(), maxInline: positive.optional() })),
  genui: z.object({
    surface: z.object({ container: z.literal('inline-size'), maxInline: positive, gap: positive, radius: z.string(), bg: z.string(), border: z.string() }),
    layoutGrammar: z.object({ stack: z.object({ gap: z.array(positive) }), split: z.object({ minColPx: positive, maxCols: positive.int(), gap: positive }), metrics: z.object({ minColPx: positive, maxCols: positive.int(), gap: positive }) }),
    streaming: z.object({ loadingPattern: z.literal('explicit-text-status'), hoistRootFirst: z.literal(true), updateThrottleMs: positive, reserveMinHeightPx: positive }),
    fixtures: z.object({ panes: z.array(positive) }),
    allowlist: z.array(z.string()).length(9), limits: z.object({ maxDepth: positive.int(), maxNodes: positive.int(), maxText: positive.int(), maxItems: positive.int() }),
    model: z.object({ available: z.boolean(), maxBytes: positive, maxShardBytes: positive, pathPrefix: z.literal('/models/'), cache: z.string() }),
  }),
  layout: z.record(z.string(), span),
  layoutRows: z.array(z.record(z.string(), z.array(z.array(z.string())))),
  section: z.array(z.object({ id: z.string(), key: z.string(), emptyKey: z.string().optional(), slots: z.array(z.object({ key: z.string(), primitive: z.string() })) })),
  locales: z.record(z.string(), z.record(z.string(), z.string())),
});

export function luminance(hex: string): number {
  const c = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
}
export function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function geometry(d: Design = design, width?: number) {
  return tiers.map(tier => {
    const viewport = width ?? d.breakpoint[tier].reference;
    const { columns, margin, gutter } = d.grid.tiers[tier];
    const inner = Math.min(viewport - 2 * margin, d.grid.maxInner);
    const track = (inner - (columns - 1) * gutter) / columns;
    return { tier, viewport, columns, gutter, inner, track, spans: Array.from({ length: columns }, (_, i) => (i + 1) * track + i * gutter) };
  });
}
/** Encoded-sRGB mix, matching CSS color-mix(in srgb, ...). */
export function mix(base: string, overlay: string, amount: number): string {
  const rgb = (hex: string) => hex.slice(1).match(/../g)!.map(v => parseInt(v, 16));
  const a = rgb(base), b = rgb(overlay);
  return '#' + a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount).toString(16).padStart(2, '0')).join('');
}
export function derivedStates(d: Design, mode: 'light' | 'dark') {
  const r = d.color.roles, s = d.color.states;
  return {
    surfaceHover: mix(r['bg-surface'][mode], r['text-ink'][mode], s.surfaceHover),
    surfaceActive: mix(r['bg-surface'][mode], r['text-ink'][mode], s.surfaceActive),
    primaryHover: mix(r['bg-brand'][mode], r['text-on-primary'][mode], s.primaryHover),
    primaryActive: mix(r['bg-brand'][mode], r['text-on-primary'][mode], s.primaryActive),
    selected: mix(r['bg-surface'][mode], r['status-info'][mode], s.selected),
  };
}
export function contrastMeasurements(d: Design = design) {
  return (['light', 'dark'] as const).flatMap(mode => [false, true].flatMap(more => {
    const roles = d.color.roles as Record<string, { light: string; dark: string }>;
    const state = derivedStates(d, mode);
    const results = d.color.pairs.flatMap(pair => pair.bg.map(bg => ({ mode: `${mode}${more ? '+more' : ''}`, fg: pair.fg, bg, ratio: contrast(roles[pair.fg][mode], roles[bg][mode]), threshold: pair.min })));
    for (const [bg, value] of Object.entries(state)) {
      const primary = bg.startsWith('primary');
      // Status/secondary text stays on base surfaces; these states carry ink.
      const fg = primary ? 'text-on-primary' : 'text-ink';
      results.push({ mode: `${mode}${more ? '+more' : ''}`, fg, bg, ratio: contrast(roles[fg][mode], value), threshold: 7 });
      results.push({ mode: `${mode}${more ? '+more' : ''}`, fg: 'focus-ring', bg, ratio: contrast(roles['focus-ring'][mode], primary ? roles['bg-canvas'][mode] : value), threshold: 3 });
      if (!primary) results.push({ mode: `${mode}${more ? '+more' : ''}`, fg: bg === 'surfaceActive' ? 'text-ink' : 'border-strong', bg, ratio: contrast(roles[bg === 'surfaceActive' ? 'text-ink' : 'border-strong'][mode], value), threshold: 3 });
      if (primary) for (const canvas of ['bg-canvas', 'bg-surface']) results.push({ mode: `${mode}${more ? '+more' : ''}`, fg: bg, bg: canvas, ratio: contrast(value, roles[canvas][mode]), threshold: 3 });
    }
    for (const bg of ['bg-surface', 'bg-canvas']) results.push({ mode: `${mode}${more ? '+more' : ''}`, fg: 'text-disabled', bg, ratio: contrast(roles['text-disabled'][mode], roles[bg][mode]), threshold: 4.5 });
    results.push({ mode: `${mode}${more ? '+more' : ''}`, fg: 'text-ink', bg: 'bg-mark', ratio: contrast(roles['text-ink'][mode], roles['bg-mark'][mode]), threshold: 7 });
    return results;
  }));
}

export function validateDesign(input: unknown = design): void {
  const d = schema.parse(input);
  const assert = (ok: boolean, message: string) => { if (!ok) throw new Error(message); };
  assert(d.space.target >= 44, `I17: global target ${d.space.target} <44px`);
  assert(d.type.fonts.maxBytes <= 80000, 'Font budget must not exceed 80000 bytes');
  for (const tier of tiers) {
    assert(!!d.breakpoint[tier] && !!d.grid.tiers[tier], `I16: missing tier ${tier}`);
    assert(d.grid.tiers[tier].columns > 0, `I16: ${tier} needs columns`);
  }
  for (const [key, slot] of Object.entries(d.layout)) for (const tier of tiers) {
    assert(slot[tier] <= d.grid.tiers[tier].columns, `I2: ${key}.${tier} span ${slot[tier]} exceeds ${d.grid.tiers[tier].columns}`);
  }
  for (const group of d.layoutRows) for (const tier of tiers) {
    assert(!!group[tier], `I2: missing row group for ${tier}`);
    for (const row of group[tier]) {
      assert(row.every(slot => slot in d.layout), `I2: unknown row slot in ${tier}`);
      const sum = row.reduce((n, slot) => n + d.layout[slot][tier], 0);
      assert(sum <= d.grid.tiers[tier].columns, `I2: ${tier} row [${row.join(', ')}] sums to ${sum} > ${d.grid.tiers[tier].columns}`);
    }
  }
  for (const [name, role] of Object.entries(d.type.roles)) {
    const heading = /^h[123]$/.test(name);
    assert(heading ? role.measureCh >= 20 && role.measureCh <= 40 : role.measureCh >= 45 && role.measureCh <= 75, `I4: ${name} measure ${role.measureCh}ch outside approved range`);
    assert(role.slot in d.layout, `I18: ${name} has unknown slot ${role.slot}`);
    assert(role.font in d.type.families, `type.${name}.font unknown`);
    assert(!!role.fixed !== !!role.targets, `type.${name} needs exactly one of fixed or targets`);
    if (role.targets) {
      assert(role.min !== undefined && role.max !== undefined && role.min <= role.max, `type.${name} invalid clamp`);
      for (const tier of tiers) assert(role.targets[tier] >= role.min! && role.targets[tier] <= role.max!, `type.${name}.${tier} target outside clamp`);
    }
  }
  for (const [name, p] of Object.entries(d.primitive)) {
    for (const [v, properties] of Object.entries(p.variants)) for (const [group, token] of Object.entries(properties)) {
      assert(p.capabilities.includes(group), `I8: ${name}.${v} cannot touch ${group}`);
      const exists = group === 'bg' || group === 'text' ? token in d.color.roles
        : group === 'space' ? token in d.space.steps
        : group === 'border' ? token in d.space.border
        : group === 'radius' ? token in d.space.radius : false;
      assert(exists, `I8: ${name}.${v}.${group} unknown token ${token}`);
    }
    if (['control', 'field', 'row', 'drawer', 'disclosure', 'range'].includes(name)) assert((p.minTarget ?? 0) >= 44, `I17: ${name} target ${p.minTarget} <44px`);
  }
  for (const [slot, p] of Object.entries(d.placement)) {
    assert(slot in d.layout, `I1: unknown placement ${slot}`);
    for (const tier of ['lg', 'xl', '2xl'] as const) assert(p.start + d.layout[slot][tier] - 1 <= d.grid.tiers[tier].columns, `I2: placement ${slot} exceeds ${tier}`);
  }
  const g = d.genui;
  assert(g.surface.bg in d.color.roles && g.surface.radius in d.space.radius && g.surface.gap in d.space.steps && g.surface.border in d.space.border, 'I8: GenUI surface unknown token');
  for (const step of [...g.layoutGrammar.stack.gap, g.layoutGrammar.split.gap, g.layoutGrammar.metrics.gap]) assert(step in d.space.steps, 'I8: GenUI gap unknown token');
  assert(new Set(g.allowlist).size === 9 && g.allowlist.every(n => /^Reme[A-Za-z]+$/.test(n)), 'I9: GenUI allowlist');
  assert(g.model.maxBytes <= 150000000 && g.model.maxShardBytes <= 20971520, 'Model budgets must not be relaxed');
  const ids = new Set<string>(), slots = new Set<string>();
  for (const s of d.section) {
    assert(!ids.has(s.id), `duplicate section ${s.id}`); ids.add(s.id);
    for (const slot of s.slots) {
      assert(!slots.has(slot.key), `duplicate slot ${slot.key}`); slots.add(slot.key);
      assert(slot.key in d.layout, `I1: ${slot.key} missing layout`);
      assert(slot.primitive in d.primitive, `I9: ${slot.key} unknown primitive ${slot.primitive}`);
    }
    if (s.emptyKey) for (const locale of d.meta.locales) assert(!!d.locales[locale]?.[s.emptyKey], `I10: ${locale}.${s.emptyKey} missing`);
  }
  for (const [name, status] of Object.entries(d.color.status)) {
    assert(status.token in d.color.roles, `I11: ${name} unknown token`);
    for (const locale of d.meta.locales) assert(!!d.locales[locale]?.[status.labelKey], `I11: ${name} missing ${locale} label`);
  }
  const keys = Object.keys(d.locales.en).sort().join();
  for (const locale of d.meta.locales) assert(Object.keys(d.locales[locale]).sort().join() === keys, `I10: ${locale} catalog keys differ`);
  for (const p of d.color.pairs) {
    assert(p.fg in d.color.roles && p.bg.every(bg => bg in d.color.roles), `I3: unknown contrast role ${p.fg}`);
    assert(p.min >= (p.kind === 'text' ? 7 : 3), `I3: ${p.fg} threshold was relaxed`);
  }
  for (const m of contrastMeasurements(input as Design)) assert(m.ratio >= m.threshold, `I3: ${m.mode} ${m.fg}/${m.bg} ${m.ratio.toFixed(4)}:1 < ${m.threshold}:1`);
  for (const g of geometry(input as Design)) {
    assert(Math.abs(g.inner - (g.columns * g.track + (g.columns - 1) * g.gutter)) < .01, `I16: ${g.tier} grid identity`);
    assert(g.track > 0, `I16: ${g.tier} negative track`);
  }
}

const banner = '/* GENERATED by npm run design:gen from src/design. Do not edit. */\n';
const key = (s: string) => s.replaceAll('.', '-');
const num = (n: number) => Number(n.toFixed(6));

/** Pure manifest -> file map. No filesystem, clock, network, or randomness. */
export function renderDesign(d: Design = design): Record<string, string> {
  validateDesign(d);
  const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
  const vars = (mode: 'light' | 'dark') => [...Object.entries(d.color.roles).map(([name, value]) => `  --${name}: ${value[mode]};`), ...Object.entries(derivedStates(d, mode)).map(([name, value]) => `  --state-${name}: ${value};`)].join('\n');
  let css = banner + Object.entries(d.type.fonts.files).map(([family, file]) => `@font-face { font-family: '${family.startsWith('serif') ? 'Newsreader' : 'Inter'}'; src: url('${file}') format('woff2'); font-style: ${family === 'serifItalic' ? 'italic' : 'normal'}; font-weight: ${family === 'serifItalic' ? d.type.fonts.italicWeight : `${d.type.fonts.weightMin} ${d.type.fonts.weightMax}`}; font-display: swap; }\n`).join('') + `:root {\n${vars('light')}\n`;
  for (const [n, v] of Object.entries(d.space.steps)) css += `  --space-${n}: ${v}px;\n`;
  for (const [n, v] of Object.entries(d.space.radius)) css += `  --radius-v4-${n}: ${v}px;\n`;
  for (const [n, v] of Object.entries(d.space.border)) css += `  --border-width-${n}: ${v}px;\n`;
  for (const [n, v] of Object.entries(d.space.layer)) css += `  --z-${n}: ${v};\n`;
  for (const [n, v] of Object.entries(d.type.families)) css += `  --v4-font-${n}: ${v};\n`;
  css += `  --header-h: ${d.space.header}px;\n  --target-min: ${d.space.target}px;\n  --icon-size: ${d.space.icon}px;\n`;
  css += `}\n`;
  css += `:root[data-theme='reme-dark'], :root.dark {\n${vars('dark')}\n}\n`;
  css += `@media (prefers-color-scheme: dark) { :root:not(.light):not([data-theme='reme-light']) {\n${vars('dark')}\n} }\n`;
  css += `.reme-page { background: var(--bg-canvas); color: var(--text-ink); font-family: var(--v4-font-sans); padding-block-end: var(--space-20); padding-inline: env(safe-area-inset-left) env(safe-area-inset-right); caret-color: var(--text-ink); }\n`;
  css += `.r-grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: var(--gap); inline-size: min(calc(100% - 2 * var(--pad)), ${d.grid.maxInner}px); margin-inline: auto; }\n`;
  css += `.r-grid > *, .r-slot { min-inline-size: 0; }\n.r-slot { container-type: inline-size; }\n`;
  const fixtures: Array<unknown> = [];
  for (const g of geometry(d)) {
    const b = d.breakpoint[g.tier].min, t = d.grid.tiers[g.tier];
    let rules = `.r-grid { --cols: ${t.columns}; --gap: ${t.gutter}px; --pad: ${t.margin}px; }\n.r-section { margin-block-start: ${d.space.sectionGap[g.tier]}px; }\n`;
    for (const [slot, spans] of Object.entries(d.layout)) rules += `.r-slot-${key(slot)} { grid-column: span ${spans[g.tier]}; }\n`;
    if (g.tier !== 'xs' && g.tier !== 'md') for (const [slot, p] of Object.entries(d.placement)) rules += `.r-slot-${key(slot)} { grid-column: ${p.start} / span ${d.layout[slot as keyof typeof d.layout][g.tier]};${'maxInline' in p ? ` max-inline-size: ${p.maxInline}px; inline-size: 100%; justify-self: center;` : ''} }\n`;
    for (const [role, value] of Object.entries(d.type.roles)) {
      if ('targets' in value) {
        const span = d.layout[value.slot][g.tier];
        const slotWidth = span * g.track + (span - 1) * g.gutter;
        const target = value.targets[g.tier];
        rules += `.r-${role} { font-size: clamp(${num(value.min / d.type.remBase)}rem, ${num(target / slotWidth * 100)}cqi, ${num(target / d.type.remBase)}rem); }\n`;
        fixtures.push({ tier: g.tier, role, slot: value.slot, slotWidth: num(slotWidth), size: target, cqi: num(target / slotWidth * 100) });
      }
    }
    css += b ? `@media (min-width: ${b}px) {\n${rules}}\n` : rules;
  }
  for (const [name, role] of Object.entries(d.type.roles)) {
    css += `.reme-page .r-${name} { font-family: var(--v4-font-${role.font}); font-weight: ${role.weight}; line-height: ${role.lh}; max-inline-size: ${role.measureCh}ch; margin-block: 0; overflow-wrap: anywhere;${'fixed' in role ? ` font-size: ${num(role.fixed / d.type.remBase)}rem;` : ''} }\n`;
  }
  for (const [name, p] of Object.entries(d.primitive)) for (const [v, props] of Object.entries(p.variants)) {
    css += `.r-${name}${v === 'default' ? '' : `-${v}`} { `;
    for (const [group, token] of Object.entries(props)) {
      css += group === 'bg' ? `background: var(--${token}); ` : group === 'text' ? `color: var(--${token}); `
        : group === 'radius' ? `border-radius: var(--radius-v4-${token}); `
        : group === 'space' ? `padding: var(--space-${token}); `
        : group === 'border' ? `border: var(--border-width-${token}) solid var(--border-line); ` : '';
    }
    if ('minTarget' in p) css += `min-block-size: ${p.minTarget}px; min-inline-size: ${p.minTarget}px; `;
    css += '}\n';
  }
  css += `.r-flow { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4); }\n.r-flow-wide { gap: var(--space-6); }\n.r-hero { align-items: center; padding-block: var(--space-12); border-block-end: var(--border-width-hair) solid var(--border-line); }\n.r-heading { margin-block-end: var(--space-6); }\n.r-muted { color: var(--text-ink-secondary); }\n.r-icon { inline-size: var(--icon-size); block-size: var(--icon-size); flex-shrink: 0; }\n.r-control-primary, .r-control-secondary { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); padding-block: var(--space-3); text-decoration: none; font: inherit; font-weight: ${d.type.roles.h3.weight}; text-align: center; }\n.r-control-secondary { border-color: var(--border-strong); }\n.r-control-primary:hover { background: var(--state-primaryHover); }\n.r-control-primary:active { background: var(--state-primaryActive); }\n.r-control-secondary:hover { background: var(--state-surfaceHover); }\n.r-control-secondary:active { background: var(--state-surfaceActive); border-color: var(--text-ink); }\n[aria-selected=true] { background: var(--state-selected); }\n.r-control-primary:disabled, .r-control-secondary:disabled { opacity: 1; color: var(--text-disabled); background: var(--bg-surface); cursor: not-allowed; border-style: dashed; }\n.r-row { border: 0; border-block-end: var(--border-width-hair) solid var(--border-line); padding-inline: 0; display: flex; flex-direction: column; gap: var(--space-2); }\n.r-row:first-child { padding-block-start: 0; }\n.r-row-link { display: inline-flex; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); color: inherit; text-underline-offset: var(--space-1); overflow-wrap: anywhere; }\n.r-row-link:hover { text-decoration: underline; }\n.r-topic { text-decoration: none; display: flex; flex-direction: column; gap: var(--space-4); block-size: 100%; }\n.r-topic:hover { border-color: var(--border-strong); }\n.r-frame { inline-size: 100%; aspect-ratio: ${d.primitive.frame.ratio}; overflow: hidden; }\n.r-frame picture { display: block; inline-size: 100%; block-size: 100%; }\n.r-frame img { inline-size: 100%; block-size: 100%; object-fit: cover; }\n.r-list { list-style: none; padding: 0; margin: 0; }\n.r-status { display: flex; align-items: center; gap: var(--space-2); }\n`;
  for (const [name, status] of Object.entries(d.color.status)) css += `.r-status-${name} { color: var(--${status.token}); }\n`;
  css += `.r-disclosure { padding-inline: 0; border-inline: 0; border-block-start: 0; }\n.r-disclosure summary { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); cursor: pointer; list-style: none; min-block-size: var(--target-min); min-inline-size: var(--target-min); }\n.r-disclosure summary::-webkit-details-marker { display: none; }\n.r-disclosure summary::after { content: '${d.primitive.disclosure.sign.closed}'; }\n.r-disclosure[open] summary::after { content: '${d.primitive.disclosure.sign.open}'; }\n.r-disclosure p { padding-block-start: var(--space-4); }\n.reme-page :focus-visible { outline: ${d.space.focus.width}px solid var(--focus-ring); outline-offset: ${d.space.focus.offset}px; }\n.reme-page [id] { scroll-margin-block-start: calc(var(--header-h) + var(--space-3)); }\n.reme-page ::selection { background: var(--text-ink); color: var(--bg-canvas); }\n`;
  css += `.reme-page > footer { background: var(--bg-canvas); }\n.reme-page > header { z-index: var(--z-sticky); }\n.reme-page > header > div { block-size: var(--header-h); }\n`;
  css += `.r-noscript-nav { display: flex; flex-wrap: wrap; gap: var(--space-4); padding-inline: var(--space-4); } .r-noscript-nav a { display: inline-flex; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); } header:has(.r-noscript-nav) { position: static; }\n`;
  css += `.r-chrome-width { inline-size: min(calc(100% - 2 * var(--pad, ${d.grid.tiers.xs.margin}px)), ${d.grid.maxInner}px); margin-inline: auto; }\n`;
  css += `@media (prefers-contrast: more) { :root { --border-line: var(--border-strong); } .reme-page .r-card, .reme-page .r-field { border-width: var(--border-width-strong); } }\n`;
  css += `@media (forced-colors: active) { .reme-page :is(.r-card, .r-control-primary, .r-control-secondary, .r-field) { border: ${d.space.border.hair}px solid CanvasText; } }\n`;
  css += `@media (prefers-reduced-motion: no-preference) { .r-control-primary, .r-control-secondary { transition: opacity ${d.motion.duration.base}ms ${d.motion.easing.standard}, transform ${d.motion.duration.base}ms ${d.motion.easing.standard}; } }\n`;
  css += `:lang(bn) .reme-page { font-family: var(--v4-font-bn); letter-spacing: normal; text-transform: none; hyphens: none; line-height: ${d.type.bangla.bodyLh}; }\n:lang(bn) .reme-page :is(.r-body,.r-meta,.r-input) { font-family: var(--v4-font-bn); line-height: ${d.type.bangla.bodyLh}; font-synthesis: none; }\n:lang(bn) .reme-page :is(h1,h2,h3) { font-family: var(--v4-font-bn); line-height: ${d.type.bangla.headingLh}; font-synthesis: none; }\n`;
  css += `@media (orientation: landscape) and (max-height: ${d.space.landscape.maxHeight}px) { .reme-page > header { position: static; } .reme-page .r-hero .r-frame { max-block-size: ${d.space.landscape.visualMaxDvh}dvh; } }\n`;
  css += `@media print { .reme-page { background: Canvas; color: CanvasText; } .reme-page :is(.r-control-primary,.r-control-secondary) { display: none; } .reme-page a[href^='http']::after { content: ' (' attr(href) ')'; } .reme-page .r-card { border-color: CanvasText; } }\n`;
  css += surfaceCSS(d);
  const slots = Object.fromEntries(d.section.flatMap(s => s.slots.map(slot => [slot.key, { className: `r-slot r-slot-${key(slot.key)}`, 'data-slot': slot.key, ...Object.fromEntries(tiers.map(t => [`data-span-${t}`, d.layout[slot.key][t]])) }])));
  const typeRows = Object.entries(d.type.roles).map(([name, r]) => `| ${name} | ${r.font} | ${r.measureCh}ch | ${'fixed' in r ? `${r.fixed}px` : Object.entries(r.targets).map(([tier, n]) => `${tier}: ${n}px`).join(', ')} |`).join('\n');
  const gridRows = geometry(d).map(g => `| ${g.tier} | ${g.viewport} | ${g.columns} | ${g.gutter} | ${num(g.inner)} | ${num(g.track)} |`).join('\n');
  const wireframes = d.section.map(s => `## ${s.id} ${s.key}\n\n` + s.slots.map(slot => `- ${slot.key} → ${slot.primitive} · ` + tiers.map(t => `${t}: ${d.layout[slot.key][t]}`).join(' / ')).join('\n') + ('emptyKey' in s ? `\n- Empty: \`${s.emptyKey}\`` : '')).join('\n\n');
  return {
    'src/generated/design.css': css,
    'src/generated/palette.json': json(Object.fromEntries((['light', 'dark'] as const).map(mode => [mode, Object.fromEntries(Object.entries(d.color.roles).map(([name, values]) => [name, values[mode]]))]))),
    'src/generated/media.ts': `// GENERATED by npm run design:gen. Do not edit.\nexport const fontFiles = ${JSON.stringify(Object.fromEntries(Object.entries(d.type.fonts.files).filter(([role]) => role !== 'serifItalic')))} as const;\nexport const coverMedia = ${JSON.stringify({ width: d.primitive.frame.mediaWidth, height: d.primitive.frame.mediaHeight, fallback: d.primitive.frame.fallback, sizes: `(min-width: ${d.breakpoint.xl.min}px) ${Math.ceil(geometry(d)[3].spans[6])}px, (min-width: ${d.breakpoint.lg.min}px) ${Math.ceil(geometry(d)[2].spans[6])}px, 100vw` })} as const;\n`,
    'src/generated/slots.ts': `// GENERATED by npm run design:gen. Do not edit.\nexport const slots = ${JSON.stringify(slots, null, 2)} as const;\nexport type Slot = keyof typeof slots;\n`,
    'src/generated/fixtures/geometry.json': json(geometry(d)),
    'src/generated/fixtures/type.json': json(fixtures),
    'src/generated/fixtures/fonts.json': json(d.type.fonts),
    'src/generated/fixtures/sections.json': json(d.section),
    'src/generated/fixtures/contrast.json': json(contrastMeasurements(d)),
    'src/generated/fixtures/genui.json': json(d.genui),
    'src/generated/fixtures/layouts.json': json({ slots: d.layout, placement: d.placement, rows: d.layoutRows }),
    'src/generated/fixtures/primitives.json': json(d.primitive),
    'docs/design/TOKENS.generated.md': `# Reme v4.1 tokens (generated)\n\nSource: \`src/design\`. Next.js/Tailwind 4 adaptation.\n\n## Grid\n\n| Tier | Viewport | Columns | Gutter | Inner | Track |\n| --- | --- | --- | --- | --- | --- |\n${gridRows}\n\n## Type\n\nHeading caps follow the author-approved I4 exception.\n\n| Role | Family | Measure | Target |\n| --- | --- | --- | --- |\n${typeRows}\n\n## Contrast\n\n${contrastMeasurements(d).map(m => `- ${m.mode}: ${m.fg} on ${m.bg}: **${m.ratio.toFixed(4)}:1** ≥ ${m.threshold}:1`).join('\n')}\n`,
    'docs/design/WIREFRAMES.generated.md': `# Reme v4.1 section composition (generated)\n\n${wireframes}\n\n## Subpage layout contracts\n\n${Object.entries(d.layout).filter(([name]) => /^(archive|article|labPage|workspace|searchPage|topicsPage|topicPage|datasetsPage|aboutPage|dispatchThanks|notFound|footer)\./.test(name)).map(([name, spans]) => `- ${name}: ${JSON.stringify(spans)}`).join('\n')}\n\n## GenUI allowlist\n\n${d.genui.allowlist.join(', ')}\n\nS0 header/S10 footer and figure internals retain existing shared components; see MIGRATION.md.\n`,
  };
}
