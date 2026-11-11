// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LocaleProvider from '@/components/i18n/LocaleProvider';
import ThemeToggle, { resolveEffectiveTheme } from '@/components/ThemeToggle';

describe('Archival typography, 68ch prose, Bengali rhythm & ThemeToggle', () => {
  it.each(['app/globals.css', 'cloudflare-pages/src/globals.css'])('%s enforces font stacks, 68ch, and bn line-height', (file) => {
    const css = readFileSync(join(process.cwd(), file), 'utf8');
    expect(css).toContain('Hind Siliguri');
    expect(css).toContain('Noto Serif Bengali');
    expect(css).toContain('JetBrains Mono');
    expect(css).toContain('68ch');
    expect(css).toMatch(/:root\[lang="bn"\][\s\S]*line-height:\s*1\.7/);
  });

  it('resolves light/dark preference deterministically and renders an accessible 44px button', () => {
    expect(resolveEffectiveTheme('dark', false)).toBe('dark');
    expect(resolveEffectiveTheme('light', true)).toBe('light');
    expect(resolveEffectiveTheme('system', true)).toBe('dark');
    const html = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ThemeToggle)));
    expect(html).toContain('min-h-11');
    expect(html).toContain('aria-label=');
  });
});
