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

const ASSISTANT_DESCRIPTION = 'Ask the archive: browser-side, deterministic retrieval with source quotations. No language model, cloud sync, or outbound query.';

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
    <div className="reme-page">
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
        className="r-grid r-section"
      >
        <header className="r-slot r-slot-section-head r-flow">
          <h1 className="r-h1">
            Ask the archive
          </h1>
          <p className="r-body r-muted">
            This assistant answers questions about the published essays by quoting them. It runs
            against the same build-time index that powers{' '}
            <Link
              href="/search"
              className="r-row-link"
            >
              Search
            </Link>
            , and there is no language model behind it. Answers are extractive on purpose — every
            claim in a reply is a quote you can open and check.{' '}
            No request carries your words off this site.
          </p>
        </header>

        <div className="r-slot r-slot-workspace-thread">
          <AssistantThread suggestions={suggestions} />
        </div>

        <noscript><div className="r-slot r-slot-section-head">
          <p className="r-callout r-body">
            The assistant needs JavaScript because it searches the index locally in your browser.
            Without it, use{' '}
            <Link href="/search" className="r-row-link">
              the server-rendered search
            </Link>{' '}
            — it answers the same questions as a ranked list of essays.
          </p>
        </div></noscript>

        <section aria-labelledby="how-it-works" className="r-slot r-slot-section-head r-section r-flow">
          <h2 id="how-it-works" className="r-h2">
            How it works
          </h2>
          <div className="assistant-info-grid">
            <div className="r-flow">
              <span className="assistant-label">
                <Braces className="r-icon" aria-hidden="true" />
              </span>
              <h3 className="r-h3">Local retrieval</h3>
              <p className="r-body r-muted">
                The essay texts are cut into passages and matched with fuzzy search in your browser.
                The index is a static file built with the site.
              </p>
            </div>
            <div className="r-flow">
              <span className="assistant-label">
                <Search className="r-icon" aria-hidden="true" />
              </span>
              <h3 className="r-h3">Quoted answers</h3>
              <p className="r-body r-muted">
                Replies are composed from the matched passages verbatim, grouped by essay, with a
                source list. When nothing matches, it says so instead of guessing.
              </p>
            </div>
            <div className="r-flow">
              <span className="assistant-label">
                <ShieldCheck className="r-icon" aria-hidden="true" />
              </span>
              <h3 className="r-h3">Private by design</h3>
              <p className="r-body r-muted">
                The conversation stays in memory in this tab. There is no cloud sync or model service.
              </p>
            </div>
          </div>
          <p className="r-body r-muted">
            The chat interface is built on{' '}
            <a
              href="https://www.assistant-ui.com/"
              target="_blank"
              rel="noreferrer noopener"
              className="r-row-link"
            >
              assistant-ui
            </a>{' '}
            primitives, restyled with this site&apos;s design tokens. Follow new essays and their
            sources in{' '}
            <Link
              href="/about"
              className="r-row-link"
            >
              About
            </Link>
            , or browse the full{' '}
            <Link
              href="/blog"
              className="r-row-link"
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
