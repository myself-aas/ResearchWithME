import type { Metadata } from 'next';
import Link from 'next/link';
import { Braces, ShieldCheck, Search } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AssistantThread from '@/components/assistant/AssistantThread';
import { getSearchIndex } from '@/lib/content/posts';
import { suggestPrompts } from '@/lib/assistant/retrieval';
import { pageMetadata } from '@/lib/seo';
import { jsonLdScript, webPageJsonLd } from '@/lib/seo/jsonld';

const ASSISTANT_DESCRIPTION =
  'Ask the archive: a browser-side assistant answers questions about every published essay by quoting it and linking to the source. No model service, and no query leaves your browser.';

export const metadata: Metadata = pageMetadata({
  title: 'Assistant',
  description: ASSISTANT_DESCRIPTION,
  path: '/assistant',
});

/**
 * `/assistant` — a chat surface over the archive, powered by assistant-ui.
 *
 * The page is a statically rendered shell; the thread island is the only
 * client JavaScript on the route and is code-split so no other page loads it
 * (AGENTS.md §9, §18). The explanation below is server-rendered, so the page
 * says what it is even without JavaScript — the contract requires that the
 * readable part of every page survive `curl` (§1.2, §8.5).
 */
export default function AssistantPage() {
  const suggestions = suggestPrompts(getSearchIndex());

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            webPageJsonLd({ name: 'Assistant', description: ASSISTANT_DESCRIPTION, path: '/assistant' }),
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
            Ask the archive
          </h1>
          <p className="mt-3 font-sans text-base leading-relaxed text-ink-secondary">
            This assistant answers questions about the published essays by quoting them. It runs
            entirely in your browser against the same build-time index that powers{' '}
            <Link
              href="/search"
              className="font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
            >
              Search
            </Link>
            : there is no language model behind it, no account, and no request that carries your
            words off this site. Answers are extractive on purpose — every claim in a reply is a
            quote you can open and check.
          </p>
        </header>

        <div className="pt-8">
          <AssistantThread suggestions={suggestions} />
        </div>

        <noscript>
          <p className="mt-6 rounded-xl border border-line bg-surface-subtle p-4 font-sans text-sm leading-relaxed text-ink-secondary">
            The assistant needs JavaScript because it searches the index locally in your browser.
            Without it, use{' '}
            <Link href="/search" className="font-semibold text-brand underline underline-offset-4">
              the server-rendered search
            </Link>{' '}
            — it answers the same questions as a ranked list of essays.
          </p>
        </noscript>

        <section aria-labelledby="how-it-works" className="mt-12 border-t border-line pt-10">
          <h2 id="how-it-works" className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            How it works
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-selection text-brand">
                <Braces className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-sans text-sm font-semibold text-ink">Local retrieval</h3>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-secondary">
                The essay texts are cut into passages and matched with fuzzy search in your browser.
                The index is a static file built with the site.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-selection text-brand">
                <Search className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-sans text-sm font-semibold text-ink">Quoted answers</h3>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-secondary">
                Replies are composed from the matched passages verbatim, grouped by essay, with a
                source list. When nothing matches, it says so instead of guessing.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-selection text-brand">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-sans text-sm font-semibold text-ink">Private by design</h3>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-secondary">
                The thread lives in memory and dies with the tab. Nothing is stored, tracked, or
                sent anywhere — the index travels to you, not the reverse.
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
            The chat interface is built on{' '}
            <a
              href="https://www.assistant-ui.com/"
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
            >
              assistant-ui
            </a>{' '}
            primitives, restyled with this site&apos;s design tokens. Follow new essays and their
            sources in{' '}
            <Link
              href="/about"
              className="font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
            >
              About
            </Link>
            , or browse the full{' '}
            <Link
              href="/blog"
              className="font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
            >
              archive
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
