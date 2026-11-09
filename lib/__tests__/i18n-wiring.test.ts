// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import LocaleSwitcher from '@/components/i18n/LocaleSwitcher';
import LocaleProvider from '@/components/i18n/LocaleProvider';

describe('route-level i18n wiring (§30)', () => {
  it('LocaleSwitcher renders EN + Bangla options', () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, null, createElement(LocaleSwitcher)));
    expect(html).toContain('value="en"');
    expect(html).toContain('value="bn"');
    expect(html).toContain('English');
    expect(html).toContain('বাংলা');
    expect(html).toContain('aria-label="Interface language"');
  });

  it('root layout declares lang + dir and wraps children in LocaleProvider', () => {
    const layout = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('lang="en" dir="ltr"');
    expect(layout).toContain('LocaleProvider');
  });

  it('globals.css has Bangla + Arabic script stacks and LTR isolation for RTL', () => {
    const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    expect(css).toContain(':root[lang="bn"]');
    expect(css).toContain('Noto Serif Bengali');
    expect(css).toContain('Noto Sans Bengali');
    expect(css).toContain(':root[lang="ar"]');
    expect(css).toContain('Noto Sans Arabic');
    expect(css).toContain('[dir="rtl"] code');
    expect(css).toContain('unicode-bidi: isolate');
  });
});

describe('Remotion/Hyperframes token consumers (§44)', () => {
  it('video token outputs exist and compositions contain no hard-coded hex', () => {
    const videoCss = readFileSync(join(process.cwd(), 'tokens/generated/tokens.video.css'), 'utf8');
    expect(videoCss).toContain('--pieme-video-color-action-primary: #4F46E5');
    expect(videoCss).toContain('Noto Sans Bengali');
    const dir = join(process.cwd(), 'videos');
    const htmlFiles = readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.html')) as string[];
    expect(htmlFiles.length).toBeGreaterThan(0);
    for (const f of htmlFiles) {
      const s = readFileSync(join(dir, f), 'utf8');
      expect(s, `${f} still has hard-coded hex`).not.toMatch(/#[0-9a-fA-F]{6}/);
      expect(s, `${f} missing token import`).toContain('tokens.video.css');
    }
  });
});
