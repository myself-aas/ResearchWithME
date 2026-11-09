import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  t,
  SUPPORTED_LOCALES,
  isValidBcp47,
  resolveLocale,
  isRTL,
  dirOf,
  pseudoLocalize,
  expansionRatio,
  formatDate,
  formatNumber,
  DEFAULT_LOCALE,
} from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n';
import en from '@/lib/i18n/messages/en.json';
import bn from '@/lib/i18n/messages/bn.json';
import SearchResult from '@/components/scholarly/SearchResult';
import { lexicalSearch, exactIdentifierSearch, semanticSearch, aiExpandedSearch } from '@/lib/scholarly/search';

describe('locales (§30)', () => {
  it('supports English and Bangla; validates BCP 47 tags', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'bn']);
    expect(isValidBcp47('bn-BD')).toBe(true);
    expect(isValidBcp47('en')).toBe(true);
    expect(isValidBcp47('not a tag!!')).toBe(false);
    expect(resolveLocale('bn-BD')).toBe('bn');
    expect(resolveLocale('fr')).toBe(DEFAULT_LOCALE);
  });

  it('RTL verification with Arabic', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('ar-EG')).toBe(true);
    expect(dirOf('ar-SA')).toBe('rtl');
    expect(dirOf('en')).toBe('ltr');
    expect(dirOf('bn')).toBe('ltr');
  });
});

describe('dictionaries (§30)', () => {
  it('bn has exactly the same keys as en (parity)', () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort());
  });

  it('t() resolves keys, falls back to English, interpolates vars', () => {
    const key: MessageKey = 'search.results';
    expect(t('en', key, { count: 5 })).toBe('5 results');
    expect(t('bn', key, { count: 5 })).toBe('5 ফলাফল');
    expect(t('xx', 'card.evidence')).toBe('Evidence'); // unknown locale → en
  });
});

describe('pseudo-localization (≥35% expansion)', () => {
  it('every English message expands by at least 35%', () => {
    for (const [key, value] of Object.entries(en)) {
      const p = pseudoLocalize(value);
      expect(expansionRatio(value, p), key).toBeGreaterThanOrEqual(1.35);
    }
  });
});

describe('locale-aware formatting', () => {
  it('formats dates and numbers per locale', () => {
    expect(formatDate('2026-11-09T12:00:00Z', 'en')).toContain('2026');
    expect(formatDate('2026-11-09T12:00:00Z', 'bn-BD')).toContain('২০২৬');
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'bn')).toBe('১২,৩৪,৫৬৭');
  });
});

describe('search modes are labeled (§28)', () => {
  const corpus = [
    { id: '1', title: 'Deep learning for vision', body: 'We study neural networks for images.', identifiers: ['10.1000/aaa'], keywords: ['neural', 'vision'] },
    { id: '2', title: 'Optimization methods', body: 'Gradient descent variants compared.', identifiers: ['10.1000/bbb'], keywords: ['optimization'] },
  ];

  it('lexical matches terms; exact-identifier is never fuzzy; semantic uses keywords; ai-expanded is labeled', () => {
    expect(lexicalSearch('neural networks', corpus).map((r) => r.item.id)).toEqual(['1']);
    expect(exactIdentifierSearch('10.1000/AAA', corpus).map((r) => r.item.id)).toEqual(['1']); // DOI normalized to lowercase
    expect(exactIdentifierSearch('neural', corpus)).toEqual([]); // not an identifier → no fuzzy match
    expect(semanticSearch('vision', corpus).map((r) => r.item.id)).toContain('1');
    const ai = aiExpandedSearch('neural', corpus);
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.every((r) => r.aiExpanded && r.mode === 'ai-expanded')).toBe(true);
  });

  it('SearchResult marks AI-expanded results visibly', () => {
    const r = aiExpandedSearch('vision', corpus)[0];
    const html = renderToStaticMarkup(createElement(SearchResult, { result: r }));
    expect(html).toContain('AI-expanded');
    expect(html).toContain('verify against sources');
  });
});
