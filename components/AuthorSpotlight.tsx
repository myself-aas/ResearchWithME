import Link from 'next/link';
import { ArrowRight, GitBranch, GraduationCap } from 'lucide-react';
import type { Author } from '@/lib/blog-data';
import Reveal from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

function IdentifierLinks({ author }: { author: Author }) {
  const shared = { className: 'h-3.5 w-3.5 text-brand', 'aria-hidden': true as const };

  if (!author.orcid && !author.github) return null;

  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs font-medium text-ink">
      {author.orcid && <GraduationCap {...shared} />}
      {author.github && <GitBranch {...shared} />}
      <span>{[author.orcid && 'ORCID', author.github && 'GitHub'].filter(Boolean).join(' · ')}</span>
    </span>
  );
}

export default function AuthorSpotlight({ authors }: { authors: Author[] }) {
  if (authors.length === 0) return null;

  return (
    <section aria-labelledby="contributors-title" className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal
          variant="rise"
          className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-ink-secondary">
              Verified Specialists
            </p>
            <h2
              id="contributors-title"
              className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl"
            >
              The people behind the reviews
            </h2>
            <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
              Each profile records what a contributor studies and everything they have reviewed here.
            </p>
          </div>
          <Link
            href="/authors"
            className="group inline-flex min-h-11 items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed"
          >
            <span>All authors</span>
            <ArrowRight
              className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </Reveal>

        <Stagger as="ul" className="divide-y divide-line" amount={0.05} step={0.06}>
          {authors.map((author) => (
            <StaggerItem as="li" key={author.id} variant="rise">
              <Link
                href={`/author/${author.id}`}
                className="group grid gap-4 px-2 py-6 transition-colors hover:bg-surface sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-6"
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-sm border border-line bg-surface font-mono text-sm font-semibold text-ink transition-colors group-hover:border-brand group-hover:text-brand"
                >
                  {author.avatar}
                </span>

                <span className="min-w-0">
                  <span className="font-serif text-xl font-semibold text-ink transition-colors group-hover:text-brand">
                    {author.name}
                  </span>
                  {author.role && (
                    <span className="mt-1 block font-mono text-xs font-medium text-brand">{author.role}</span>
                  )}
                  {(author.institution || author.domain) && (
                    <span className="mt-1 block font-sans text-xs text-ink-secondary">
                      {author.institution ?? author.domain}
                    </span>
                  )}
                  <span className="mt-3 block max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
                    {author.bio}
                  </span>
                </span>

                <span className="flex shrink-0 flex-col gap-1 font-mono text-xs text-ink-secondary sm:items-end">
                  <IdentifierLinks author={author} />
                  <span>
                    {author.articleCount} {author.articleCount === 1 ? 'article' : 'articles'}
                  </span>
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
