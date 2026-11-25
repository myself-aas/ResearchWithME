/**
 * Site identity — the single source of truth for a single-author blog.
 *
 * Everything that names the site, the writer, or the canonical origin reads
 * from here. There is no author table, no editor roster, and no per-post
 * byline: every post is written by the one author declared below.
 */

export const SITE = {
  name: 'ResearchWithMe',
  shortName: 'reme',
  title: 'ResearchWithMe',
  tagline: 'Open science, reviewed in public.',
  description:
    'Long-form essays on research papers, open-source repositories, and the craft of reproducible work — written and published by Ashif Ahmed Shuvo.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me').replace(/\/$/, ''),
  locale: 'en_US',
  language: 'en',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  feedPath: '/rss.xml',
} as const;

export const AUTHOR = {
  name: 'Ashif Ahmed Shuvo',
  role: 'Writer, editor, and researcher',
  bio: 'I read papers and open-source code closely, then write down what holds up, what does not, and what I would build differently. ResearchWithMe is where those notes live.',
  shortBio: 'Writing about research papers, open-source code, and reproducible work.',
  avatar: '/images/author.jpg',
  initials: 'AS',
  links: [
    { label: 'GitHub', href: 'https://github.com/myself-aas' },
    { label: 'RSS', href: '/rss.xml' },
  ],
} as const;

/**
 * Where the site can actually be reached. Kept here so the contact page, the
 * security policy, and the footer all point at the same place.
 */
export const CONTACT = {
  profile: 'https://github.com/myself-aas',
  issues: 'https://github.com/myself-aas/ResearchWithME/issues',
  advisories: 'https://github.com/myself-aas/ResearchWithME/security/advisories/new',
} as const;

export const NAV = [
  { href: '/blog', label: 'Writing' },
  { href: '/tags', label: 'Topics' },
  { href: '/assistant', label: 'Assistant' },
  { href: '/about', label: 'About' },
  { href: '/search', label: 'Search' },
] as const;
