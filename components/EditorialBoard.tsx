/**
 * Shared editorial board surface — used by the Next app (app/editorial-board/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/editorial-board.tsx). One source of truth
 * for the markup and behavior in both runtimes until Task 16 retires Next.
 */
import Link from 'next/link';
import { ExternalLink, GraduationCap } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { EDITORIAL_BOARD } from '@/lib/research-data';
import { Text } from '@/components/primitives';

const principles = [
  {
    title: 'Evidence before assertion',
    body: 'A review that examines a paper or repository must point to the executable code, the public preprint, the dataset, or the exact release it evaluated. Claims without an artifact stay out of the archive.',
  },
  {
    title: 'Expertise that can be checked',
    body: 'Contributors publish under a scholarly identity: an ORCID record, maintainer history on a public repository, or an accredited institutional address. Profiles show that record so readers can judge it themselves.',
  },
  {
    title: 'No paywall in either direction',
    body: 'Readers pay nothing and authors pay no article processing charge. Work is released under CC BY 4.0, with corrections published rather than silently amended.',
  },
];

export default function EditorialBoard() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="border-b border-line pb-8">
          <h1 className="max-w-3xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            Editorial standards and the people who keep them
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink">
            ResearchWithMe is governed by an independent collective of researchers, systems engineers, clinicians, and data librarians. They set the review standard and sign the record when an article meets it.
          </p>
        </header>

        <section aria-labelledby="board-heading" className="py-10">
          <Text id="board-heading" as="h2" variant="page-title">
            Editorial leadership
          </Text>

          <ul className="mt-6 divide-y divide-line border-y border-line">
            {EDITORIAL_BOARD.map((member) => (
              <li key={member.orcid} className="grid gap-4 py-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-6">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 items-center justify-center rounded-lg bg-surface-inverse font-serif text-lg font-bold text-text-inverse"
                >
                  {member.avatarInitials}
                </span>
                <div className="min-w-0">
                  <Text as="h3" variant="card-title">{member.name}</Text>
                  <p className="mt-1 text-sm font-medium text-brand">{member.role}</p>
                  <p className="mt-1 text-sm text-ink-secondary">{member.institution}</p>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink">
                    <span className="font-medium text-ink">Focus: </span>
                    {member.focus}
                  </p>
                </div>
                <a
                  href={`https://orcid.org/${member.orcid}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-success underline-offset-4 hover:underline"
                >
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  <span>{member.orcid}</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">ORCID record for {member.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="principles-heading" className="border-t border-line py-10">
          <Text id="principles-heading" as="h2" variant="page-title">
            What the editorial gate checks
          </Text>
          <ol className="mt-6 space-y-8">
            {principles.map((principle, index) => (
              <li key={principle.title} className="grid gap-3 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-6">
                <span aria-hidden="true" className="font-serif text-3xl font-semibold text-brand-hover">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <Text as="h3" variant="card-title">{principle.title}</Text>
                  <p className="mt-2 max-w-prose text-base leading-relaxed text-ink">{principle.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="contribute-heading" className="border-t border-line py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="contribute-heading" className="font-serif text-2xl font-bold text-ink">
                Write with the collective
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink">
                Original explanations of research papers, repository teardowns, and field notes are welcome from writers who can show their working. There is no open manuscript intake — access comes through an application the board reviews.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/dashboard/access"
                className="inline-flex min-h-11 items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover"
              >
                Apply to write
              </Link>
            </div>
          </div>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
