import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { socialIconFor } from '@/components/layout/SocialIcons';
import { AUTHOR, SITE } from '@/lib/site';
import { getSiteStats } from '@/lib/content/posts';
import { pageMetadata } from '@/lib/seo';
import { jsonLdScript, profilePageJsonLd } from '@/lib/seo/jsonld';

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description: `About ${AUTHOR.name} and ${SITE.name}: one writer, one archive, and long-form essays on research papers, open-source code, and reproducible work.`,
  path: '/about',
});

export default function AboutPage() {
  const stats = getSiteStats();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(profilePageJsonLd()) }}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-5 pb-8 pt-12 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-10">
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">About</p>
          <h1 className="mt-3 max-w-3xl font-serif text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
            One writer, one archive, no algorithmic feed.
          </h1>
          <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-ink-secondary">
            {SITE.name} is my notebook made public: close readings of papers, teardowns of open repositories,
            and notes on what reproducible work actually takes.
          </p>
        </header>

        <section aria-labelledby="author-heading" className="mt-10 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
          <Image
            src={AUTHOR.avatar}
            alt={`Profile picture of ${AUTHOR.name}`}
            width={96}
            height={96}
            priority
            className="h-24 w-24 rounded-full border border-line object-cover"
          />
          <div>
            <h2 id="author-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
              {AUTHOR.name}
            </h2>
            <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
              {AUTHOR.role}
            </p>
            <p className="mt-4 font-sans text-base leading-relaxed text-ink-secondary">{AUTHOR.bio}</p>
            <p className="mt-3 font-sans text-base leading-relaxed text-ink-secondary">
              I publish under {SITE.license}: quote it, teach with it, remix it — just name the source. If
              something here is wrong, I would rather hear it than leave it up.
            </p>
            <ul className="mt-5 flex flex-wrap gap-3">
              {AUTHOR.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    {...(link.href.startsWith('http') ? { target: '_blank', rel: 'me noreferrer noopener' } : {})}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-sans text-sm font-medium text-ink transition-colors hover:border-brand"
                  >
                    {socialIconFor(link.label, link.href)}
                    {link.label === 'RSS' ? 'RSS feed' : link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="what-heading" className="mt-14 border-t border-line pt-8">
          <h2 id="what-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            What gets published
          </h2>
          <div className="mt-4 space-y-4 font-sans text-base leading-relaxed text-ink-secondary">
            <p>
              Long-form writing only. A post is worth publishing when it answers a question I could not answer
              from the abstract alone: does the benchmark reproduce, where does the repository hide its
              complexity, which claims survive a closer read?
            </p>
            <p>
              There are no sponsored posts, no affiliate links, and no paywall. Corrections are made in place and
              dated with an <span className="font-medium text-ink">Updated</span> line rather than quietly
              deleted.
            </p>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <dt className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">Essays</dt>
              <dd className="mt-1 font-serif text-2xl font-bold text-ink">{stats.posts}</dd>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <dt className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">Topics</dt>
              <dd className="mt-1 font-serif text-2xl font-bold text-ink">{stats.tags}</dd>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <dt className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                Words published
              </dt>
              <dd className="mt-1 font-serif text-2xl font-bold text-ink">
                {stats.words.toLocaleString('en-US')}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="built-heading" className="mt-14 border-t border-line pt-8">
          <h2 id="built-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            How this site is built
          </h2>
          <div className="mt-4 space-y-4 font-sans text-base leading-relaxed text-ink-secondary">
            <p>
              Every essay is an MDX file committed to{' '}
              <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-sm text-ink">content/posts/</code>{' '}
              in this site&apos;s GitHub repository. Frontmatter carries the title, date, description, and tags;
              the body is MDX, so a post can use figures, callouts, video, and highlighted code without leaving
              prose.
            </p>
            <p>
              A push to the repository rebuilds the site: pages are statically generated from the files at build
              time, the search index is generated from the same source, and the RSS feed is written alongside
              them. There is no database, no admin panel, and no login — the git history is the editorial
              record.
            </p>
          </div>
          <p className="mt-6">
            <Link
              href="/blog"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-action-primary px-6 py-2.5 font-sans text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Read the archive
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
