import Link from 'next/link';
import { ExternalLink, GraduationCap } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { EDITORIAL_BOARD } from '@/lib/research-data';
import PageHeader from '@/components/PageHeader';

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

export default function EditorialBoardPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="page-container page-main max-w-page flex-1">
        <PageHeader
          title="Editorial standards"
          description="An independent collective of researchers, systems engineers, clinicians, and data librarians governs ResearchWithMe. They set the review standard and sign the record when a publication meets it."
        />

        <section aria-labelledby="board-heading" className="py-10">
          <h2 id="board-heading" className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
            Editorial leadership
          </h2>

          <ul className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
            {EDITORIAL_BOARD.map((member) => (
              <li key={member.orcid} className="grid gap-4 py-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-6">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 items-center justify-center rounded-lg bg-stone-900 font-serif text-lg font-bold text-stone-50"
                >
                  {member.avatarInitials}
                </span>
                <div className="min-w-0">
                  <h3 className="font-serif text-xl font-semibold text-stone-900">{member.name}</h3>
                  <p className="mt-1 text-sm font-medium text-amber-900">{member.role}</p>
                  <p className="mt-1 text-sm text-stone-600">{member.institution}</p>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-700">
                    <span className="font-medium text-stone-900">Focus: </span>
                    {member.focus}
                  </p>
                </div>
                <a
                  href={`https://orcid.org/${member.orcid}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-emerald-900 underline-offset-4 hover:underline"
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

        <section aria-labelledby="principles-heading" className="border-t border-stone-200 py-10">
          <h2 id="principles-heading" className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
            What the editorial gate checks
          </h2>
          <ol className="mt-6 space-y-8">
            {principles.map((principle) => (
              <li key={principle.title}>
                <h3 className="font-serif text-xl font-semibold text-stone-900">{principle.title}</h3>
                <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-700">{principle.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="contribute-heading" className="border-t border-stone-200 py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="contribute-heading" className="font-serif text-2xl font-bold text-stone-900">
                Review or submit with the collective
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
                Guest analyses, computational replications, and infrastructure teardowns are welcome from practitioners who can show their working.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/verify"
                className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-white"
              >
                Record a contributor identity
              </Link>
              <Link
                href="/submit"
                className="inline-flex min-h-11 items-center rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
              >
                Submit your work
              </Link>
            </div>
          </div>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
