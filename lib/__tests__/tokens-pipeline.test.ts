import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tokens } from '@/tokens/generated/tokens';
import { contrastRatio, meetsAA, WCAG_AA_NORMAL_TEXT } from '@/lib/tokens/contrast';

const flatten = (obj: Record<string, unknown>, prefix: string[] = []): Array<[string, unknown]> =>
  Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? flatten(v as Record<string, unknown>, [...prefix, k]) : [[[...prefix, k].join('.'), v]],
  );

describe('πeme token pipeline (tokens/generated)', () => {
  it('has no unresolved {references} in generated output', () => {
    const flat = flatten(tokens as unknown as Record<string, unknown>);
    const unresolved = flat.filter(([, v]) => typeof v === 'string' && /\{[a-z0-9.\-]+\}/i.test(v));
    expect(unresolved).toEqual([]);
  });

  it('dark theme defines every theme-able light semantic key', () => {
    const themeKeys = [
      'canvas', 'surface', 'surface-subtle', 'surface-raised', 'surface-inverse',
      'text-primary', 'text-secondary', 'text-tertiary', 'text-inverse',
      'border-subtle', 'border-strong', 'focus', 'selection',
    ];
    const light = tokens.semanticLight as unknown as Record<string, string>;
    const dark = tokens.semanticDark as unknown as Record<string, string>;
    for (const k of themeKeys) {
      expect(light[k], `light.${k}`).toBeTruthy();
      expect(dark[k], `dark.${k}`).toBeTruthy();
    }
  });

  it('component tokens never reference primitive colors directly', () => {
    const src = JSON.parse(readFileSync(join(process.cwd(), 'tokens/src/component.json'), 'utf8'));
    const refs = JSON.stringify(src).match(/\{[a-z0-9.\-]+\}/gi) ?? [];
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) {
      expect(r.toLowerCase()).not.toMatch(/^\{primitive\.color\./);
    }
  });

  it('semantic text pairs meet WCAG AA in light and dark', () => {
    const pairs: Array<[string, string]> = [
      ['text-primary', 'canvas'],
      ['text-primary', 'surface'],
      ['text-secondary', 'surface'],
      ['text-tertiary', 'surface'],
      ['text-inverse', 'surface-inverse'],
    ];
    for (const theme of [tokens.semanticLight, tokens.semanticDark] as unknown as Array<Record<string, string>>) {
      for (const [fg, bg] of pairs) {
        const ratio = contrastRatio(theme[fg], theme[bg]);
        expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
        expect(meetsAA(theme[fg], theme[bg])).toBe(true);
      }
    }
  });

  it('focus ring meets 3:1 against canvas and surface in both themes', () => {
    for (const theme of [tokens.semanticLight, tokens.semanticDark] as unknown as Array<Record<string, string>>) {
      expect(contrastRatio(theme.focus, theme.canvas)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(theme.focus, theme.surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('globals.css consumes generated tokens (no duplicated literals for semantic colors)', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    expect(css).toContain('@import "../tokens/generated/tokens.css"');
    expect(css).toContain('--color-canvas: var(--pieme-canvas)');
    expect(css).toContain('--color-brand: var(--color-action-primary)');
    // stone scale is an alias over the generated πeme neutral ramp
    expect(css).toContain('--color-stone-50: var(--pieme-color-neutral-50)');
  });

  it('emits exact Archival Paper (light) and Obsidian (dark) palette tokens', () => {
    expect(tokens.semanticLight.canvas).toBe('#FAF9F6');
    expect(tokens.semanticLight.surface).toBe('#F3F1EC');
    expect(tokens.semanticLight['text-primary']).toBe('#121214');
    expect(tokens.semanticLight['text-secondary']).toBe('#5C5C63');
    expect(tokens.semanticLight['border-subtle']).toBe('rgba(18, 18, 20, 0.10)');
    expect(tokens.semanticLight.action.primary).toBe('#1D4ED8');
    expect(tokens.semanticLight.action['on-primary']).toBe('#FFFFFF');

    expect(tokens.semanticDark.canvas).toBe('#0C0D10');
    expect(tokens.semanticDark.surface).toBe('#14161B');
    expect(tokens.semanticDark['text-primary']).toBe('#F2F2F5');
    expect(tokens.semanticDark['text-secondary']).toBe('#9496A1');
    expect(tokens.semanticDark['border-subtle']).toBe('rgba(255, 255, 255, 0.10)');
    expect(tokens.semanticDark.action.primary).toBe('#60A5FA');
    expect(tokens.semanticDark.action['on-primary']).toBe('#0C0D10');
  });

  it('computes contrast for rgba() hairline tokens composited over canvas and enforces 4.5:1 on action.on-primary', () => {
    expect(contrastRatio('rgba(18, 18, 20, 0.10)', '#FAF9F6')).toBeGreaterThan(1.1);
    expect(contrastRatio(tokens.semanticLight.action['on-primary'], tokens.semanticLight.action.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens.semanticDark.action['on-primary'], tokens.semanticDark.action.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
