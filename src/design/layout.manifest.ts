// Explicit tiers; rows wrap rather than summing spans from different rows.
const full = { xs: 1, md: 2, lg: 12, xl: 12, '2xl': 12 } as const;
const split = (lg: number) => ({ xs: 1, md: 2, lg, xl: lg, '2xl': lg });
export const layout = {
  'hero.text': split(5), 'hero.visual': split(7),
  'writing.lead': split(7), 'writing.list': split(5),
  'topics.first': { xs: 1, md: 1, lg: 4, xl: 4, '2xl': 4 },
  'topics.second': { xs: 1, md: 1, lg: 4, xl: 4, '2xl': 4 },
  'topics.third': split(4),
  'figure.frame': split(6), 'figure.notes': split(6),
  'datasets.first': { xs: 1, md: 1, lg: 4, xl: 4, '2xl': 4 },
  'datasets.second': { xs: 1, md: 1, lg: 4, xl: 4, '2xl': 4 },
  'datasets.third': split(4),
  'assistant.prompt': split(7), 'assistant.links': split(5),
  'author.bio': split(8), 'author.meta': split(4),
  'faq.body': split(8), 'dispatch.body': split(8),
  'archive.filters': split(3), 'archive.feed': split(9),
  'article.header': split(10), 'article.body': split(8), 'article.toc': split(4),
  'labPage.stage': split(8), 'labPage.controls': split(4),
  'workspace.threads': split(3), 'workspace.thread': split(9),
  'searchPage.bar': split(8), 'searchPage.results': split(8),
  'topicsPage.list': full, 'topicPage.feed': full, 'datasetsPage.list': full,
  'aboutPage.bio': split(8), 'aboutPage.meta': split(4),
  'dispatchThanks.body': split(8), 'notFound.body': split(8),
  'footer.brand': split(5), 'footer.nav': { xs: 1, md: 1, lg: 4, xl: 4, '2xl': 4 }, 'footer.feed': { xs: 1, md: 1, lg: 3, xl: 3, '2xl': 3 },
  'section.head': full, 'prose': full, 'card': split(4), 'field': split(7),
} as const;

// Rows reference slots, not duplicated span numbers. Explicit row grouping
// distinguishes intentional tablet stacking from an accidental overspan.
const pair = (a: keyof typeof layout, b: keyof typeof layout) => ({
  xs: [[a], [b]], md: [[a], [b]], lg: [[a, b]], xl: [[a, b]], '2xl': [[a, b]],
});
const triple = (a: keyof typeof layout, b: keyof typeof layout, c: keyof typeof layout) => ({
  xs: [[a], [b], [c]], md: [[a, b], [c]], lg: [[a, b, c]], xl: [[a, b, c]], '2xl': [[a, b, c]],
});
export const layoutRows = [
  pair('hero.text', 'hero.visual'), pair('writing.lead', 'writing.list'),
  triple('topics.first', 'topics.second', 'topics.third'), pair('figure.frame', 'figure.notes'),
  triple('datasets.first', 'datasets.second', 'datasets.third'),
  pair('archive.filters', 'archive.feed'), pair('article.body', 'article.toc'),
  pair('labPage.stage', 'labPage.controls'), pair('workspace.threads', 'workspace.thread'),
  pair('aboutPage.bio', 'aboutPage.meta'),
  pair('assistant.prompt', 'assistant.links'), pair('author.bio', 'author.meta'),
] as const;

// Placement/caps are generated separately from span counts (no CSS exceptions).
export const placement = {
  'faq.body': { start: 3, maxInline: 720 }, 'dispatch.body': { start: 3, maxInline: 720 },
  'article.header': { start: 2 }, 'article.body': { start: 1, maxInline: 720 }, 'article.toc': { start: 9 },
  'searchPage.bar': { start: 3, maxInline: 720 }, 'searchPage.results': { start: 3, maxInline: 720 },
} as const;
