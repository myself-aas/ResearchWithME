import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { FIGURES, type FigureDefinition } from '@/lib/figures/registry';
import { pageMetadata } from '@/lib/seo';
import { jsonLdScript, webPageJsonLd } from '@/lib/seo/jsonld';

/**
 * `/lab` — the figure gallery (FIGURE_CONSTITUTION.md Article 3).
 *
 * Every registered figure renders here once with its registry defaults: the
 * library figures on their fixtures, the adopted ones exactly as their
 * articles render them. The page is the pre-adoption proving ground — a
 * figure that cannot render here, server-side and honestly labelled, cannot
 * ship into an essay — and the place to audition patterns before drafting
 * with them. Everything below is server-rendered; the figures are the only
 * client islands on the route.
 */

const LAB_DESCRIPTION =
  'The interaction patterns behind the essays: every figure in the library, rendered live with its default data, each with its own declared interaction archetype and each also maintained as generative UI in the assistant.';

export const metadata: Metadata = pageMetadata({
  title: 'Figure lab',
  description: LAB_DESCRIPTION,
  path: '/lab',
});

const isLegacy = (figure: FigureDefinition) => figure.legacy === true;

export default function LabPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            webPageJsonLd({ name: 'Figure lab', description: LAB_DESCRIPTION, path: '/lab' }),
          ),
        }}
      />
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-5 pb-8 pt-12 sm:px-6 lg:px-8"
      >
        <header className="max-w-2xl border-b border-line pb-8">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            The figure lab
          </h1>
          <p className="mt-3 font-sans text-base leading-relaxed text-ink-secondary">
            The essays teach with interactive figures, and every figure here is a reusable machine:
            the facts arrive as data, the interaction pattern is the component. Each pattern below is
            declared once in the figure registry with its own archetype, so no two figures ask your
            hands to do the same thing.
          </p>
          <p className="mt-3 font-sans text-base leading-relaxed text-ink-secondary">
            Library figures render on their fixture data and are waiting for an essay to adopt them;
            adopted figures render exactly as their articles do. Every one of them is also maintained
            as generative UI — ask the{' '}
            <Link href="/assistant" className="font-medium text-brand underline underline-offset-4">
              assistant
            </Link>{' '}
            about a topic it recognises and the same component appears in the thread.
          </p>
        </header>

        <div className="flex flex-col gap-14 py-10">
          {FIGURES.map((figure) => (
            <section key={figure.toolName} aria-labelledby={figure.toolName} className="scroll-mt-24">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider ${
                    figure.status === 'adopted'
                      ? 'border-brand/40 bg-selection/60 text-brand'
                      : 'border-line bg-canvas text-ink-secondary'
                  }`}
                >
                  {figure.status === 'adopted' ? (isLegacy(figure) ? 'Adopted · legacy' : 'Adopted') : 'Library fixture'}
                </span>
                <span className="rounded-full border border-line bg-canvas px-2.5 py-1 font-mono text-[0.6875rem] text-ink-secondary">
                  archetype: {figure.archetype}
                </span>
                <span className="font-mono text-[0.6875rem] text-ink-secondary">{figure.toolName}</span>
              </div>
              <h2
                id={figure.toolName}
                className="mt-3 font-serif text-2xl font-bold tracking-tight text-ink"
              >
                {figure.title}
              </h2>
              <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
                {figure.blurb} {figure.status === 'adopted' && !isLegacy(figure)
                  ? 'It is adopted in the essay below and routes from the assistant by its keywords.'
                  : figure.status === 'adopted'
                    ? 'It is a pre-library figure, grandfathered into the registry and scheduled for migration onto the library.'
                    : 'It ships with a fixture and is ready for an essay to adopt it with its own data.'}
              </p>
              <div className="mt-4">
                <figure.component {...figure.defaults} />
              </div>
            </section>
          ))}
        </div>

        <section aria-labelledby="lab-governance" className="border-t border-line py-10">
          <h2 id="lab-governance" className="font-serif text-2xl font-bold tracking-tight text-ink">
            How this lab is governed
          </h2>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
            New figures are not designed freehand. The figure constitution — a repository document,
            <span className="font-mono"> FIGURE_CONSTITUTION.md</span> — fixes the rules every agent
            and author follows: one interaction archetype per figure, all facts as data, chrome from
            semantic tokens only, deterministic rendering with no hidden randomness, keyboard and
            screen-reader access, motion that respects <span className="font-mono">prefers-reduced-motion</span>,
            and — non-negotiable — every figure maintained as generative UI in the assistant thread,
            registered once and derived everywhere else. A suite of automated checks enforces the
            constitution on every commit, and two templates (a component template and a post layout
            system) scaffold the next figure and the next essay.
          </p>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
            To adopt a library figure, an essay binds it to its own data module and flips the registry
            entry from <span className="font-mono">library</span> to{' '}
            <span className="font-mono">adopted</span> — the tests then require its routing keywords,
            its article server-render, and its unit tests to arrive in the same commit.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
