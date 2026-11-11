/**
 * Deterministic paper fixture for the reader-route tests. The production
 * paper seed is intentionally empty (`PUBLICATIONS_DATA = []`), so the Pages
 * runtime only ever serves papers a deployment configures — tests seed one
 * through `createTestApp({ ... }).seedPaper(...)` instead.
 *
 * `makePublication` in test/support/pages.ts fills every required field;
 * callers only need a slug and title.
 */
import type { Publication } from '@/lib/research-data';

export function paperFixture(
  overrides: Partial<Publication> & Pick<Publication, 'slug' | 'title'>,
): Partial<Publication> & Pick<Publication, 'slug' | 'title'> {
  return {
    subtitle: 'A deterministic methods note from the test fixtures.',
    authors: [
      {
        name: 'Maya Lin',
        affiliation: 'ResearchWithMe',
        orcid: '0000-0002-1825-0097',
        role: 'Editor',
      },
    ],
    abstract: `Abstract for ${overrides.title}.`,
    publishedDate: '2026-02-10',
    year: 2026,
    doi: `10.1000/test.${overrides.slug}`,
    journal: 'ResearchWithMe Review',
    volume: '2',
    issue: '3',
    pages: '45-61',
    topic: 'Scholarly Tech',
    citationCount: 7,
    readTime: '14 min read',
    keywords: ['reproducibility', 'fixtures'],
    license: 'CC-BY-4.0',
    dataUrl: 'https://data.example.org/deposits/test-paper',
    fullContent: {
      background: 'Background from the fixture.',
      methodology: 'Methodology from the fixture.',
      findings: ['Finding from the fixture.'],
      discussion: 'Discussion from the fixture.',
      implications: 'Implications from the fixture.',
      references: ['Fixture reference, 2026.'],
    },
    ...overrides,
  };
}
