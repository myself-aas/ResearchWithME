import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/tokens/contrast';

const css = readFileSync('styles/daisy-themes.css', 'utf8');

function palette(name: string): Record<string, string> {
  const block = css.split('@plugin "daisyui/theme"').find((part) => part.includes(`name: "${name}"`));
  if (!block) throw new Error(`Missing theme ${name}`);
  return Object.fromEntries([...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [match[1], match[2]]));
}

describe('daisyUI theme contrast', () => {
  for (const name of ['reme-light', 'reme-dark']) {
    it(`${name} keeps text, action, and focus colors legible`, () => {
      const colors = palette(name);
      for (const background of ['base-100', 'base-200', 'base-300']) {
        expect(contrastRatio(colors['base-content'], colors[background])).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.primary, colors[background])).toBeGreaterThanOrEqual(4.5);
      }
      for (const role of ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error']) {
        expect(contrastRatio(colors[`${role}-content`], colors[role]), role).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});


describe('daisyUI and semantic palette alignment', () => {
  for (const mode of ['light', 'dark']) {
    it(`${mode} uses the same core colors as the semantic tokens`, () => {
      const colors = palette(`reme-${mode}`);
      const tokens = JSON.parse(readFileSync(`tokens/src/semantic-${mode}.json`, 'utf8'));
      expect(colors['base-100'].toLowerCase()).toBe(tokens.canvas.toLowerCase());
      expect(colors['base-200'].toLowerCase()).toBe(tokens.surface.toLowerCase());
      expect(colors['base-300'].toLowerCase()).toBe(tokens['surface-subtle'].toLowerCase());
      expect(colors['base-content'].toLowerCase()).toBe(tokens['text-primary'].toLowerCase());
      expect(colors.primary.toLowerCase()).toBe(tokens.action.primary.toLowerCase());
      expect(colors['primary-content'].toLowerCase()).toBe(tokens.action['on-primary'].toLowerCase());
    });
  }
});
