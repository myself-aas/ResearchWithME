// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ThemeToggle, { resolveEffectiveTheme } from '@/components/ThemeToggle';

describe('Archival typography, 68ch prose & ThemeToggle', () => {
  it.each(['app/globals.css', 'cloudflare-pages/src/globals.css'])('%s enforces font stacks and 68ch reading measure', (file) => {
    const css = readFileSync(join(process.cwd(), file), 'utf8');
    expect(css).toContain('JetBrains Mono');
    expect(css).toContain('68ch');
    expect(css).toMatch(/--font-serif:\s*'Aptos Serif',\s*var\(--font-newsreader\)/);
    expect(css).toMatch(/--font-sans:\s*'Aptos',\s*var\(--font-inter\)/);
    expect(css).toMatch(/--font-mono:\s*'Aptos Mono',\s*'JetBrains Mono'/);
    expect(css).not.toMatch(/@font-face[^}]*Aptos/);
    expect(css).not.toMatch(/Hind Siliguri|Noto Serif Bengali|lang="bn"/);
  });

  it('resolves light/dark preference deterministically and renders an accessible 44px button', () => {
    expect(resolveEffectiveTheme('dark', false)).toBe('dark');
    expect(resolveEffectiveTheme('light', true)).toBe('light');
    expect(resolveEffectiveTheme('system', true)).toBe('dark');
    const html = renderToStaticMarkup(createElement(ThemeToggle));
    expect(html).toContain('min-h-11');
    expect(html).toContain('aria-label=');
  });
});
