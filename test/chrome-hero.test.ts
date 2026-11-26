import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatMonthYear, readingTimeLabel } from '@/lib/content/format';
import { FOOTER_NAV, NAV } from '@/lib/site';

const REFACTORED_FILES = [
  'app/page.tsx',
  'app/globals.css',
  'components/layout/SiteHeader.tsx',
  'components/layout/MobileMenu.tsx',
  'components/layout/SiteFooter.tsx',
  'components/post/HomeHero.tsx',
  'components/post/PostCover.tsx',
  'components/post/PostCard.tsx',
  'components/search/SearchClient.tsx',
] as const;

describe('reme v4 adapted navigation & hero contract', () => {
  it('narrows primary top-bar navigation strictly to Writing, Topics, and Lab', () => {
    expect(NAV.map((item) => item.label)).toEqual(['Writing', 'Topics', 'Lab']);
    expect(NAV.map((item) => item.href)).toEqual(['/blog', '/tags', '/lab']);
  });

  it('preserves Assistant, About, and Search in footer navigation', () => {
    const hrefs = FOOTER_NAV.map((item) => item.href);
    expect(hrefs).toContain('/assistant');
    expect(hrefs).toContain('/about');
    expect(hrefs).toContain('/search');
    expect(hrefs).toContain('/blog');
    expect(hrefs).toContain('/tags');
    expect(hrefs).toContain('/lab');
  });

  it('formats hero metadata date as Month YYYY in UTC without fabrication', () => {
    expect(formatMonthYear('2026-11-24')).toBe('Nov 2026');
    expect(formatMonthYear('2026-01-01')).toBe('Jan 2026');
    expect(readingTimeLabel(6)).toBe('6 min read');
  });

  it.each(REFACTORED_FILES)(
    '%s contains zero raw hex literals, rgb(), raw palette classes, or backdrop-blur',
    (relPath) => {
      const source = readFileSync(join(process.cwd(), relPath), 'utf8');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toMatch(/\brgba?\(/);
      expect(source).not.toMatch(
        /\b(?:bg|text|border|from|via|to|ring|outline)-(?:stone|gray|neutral|slate|zinc|white|black|orange|blue)(?:-[0-9]{2,3}|\/|\b)/,
      );
      expect(source).not.toContain('backdrop-blur');
      expect(source).not.toContain('→');
    },
  );

  it('omits single-author byline and kickers from the homepage hero', () => {
    const heroSource = readFileSync(join(process.cwd(), 'components/post/HomeHero.tsx'), 'utf8');
    expect(heroSource).not.toContain('Ashif Ahmed Shuvo');
    expect(heroSource).not.toContain('AUTHOR');
    expect(heroSource).not.toMatch(/FEATURED STUDY|TRENDING/i);
    expect(heroSource).toContain('r-h1');
    expect(heroSource).toContain('r-grid r-hero');
    expect(heroSource).toContain('name="hero.text"');
    expect(heroSource).toContain('name="hero.visual"');
    expect(heroSource).not.toContain('4vw');
  });
});
