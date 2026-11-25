import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { pageMetadata } from '@/lib/seo';
import { jsonLdScript, webPageJsonLd } from '@/lib/seo/jsonld';
import { AUTHOR, CONTACT, SITE } from '@/lib/site';

const description =
  'What ResearchWithMe stores and what it does not: no accounts, no analytics, no advertising, one theme preference, anonymous assistant sync for the archive chat, and the hosting that keeps it online.';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy',
  description,
  path: '/privacy',
});

const updated = '2026-11-25';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(webPageJsonLd({ name: 'Privacy', description, path: '/privacy' })),
        }}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-5 pb-8 pt-12 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-8">
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">Privacy</p>
          <h1 className="mt-3 font-serif text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
            This site does not want your data.
          </h1>
          <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-ink-secondary">
            {SITE.name} is a static blog. There is no account system, no comment section, no newsletter, and
            no analytics script. This page lists the few things that are still technically true when you
            read it.
          </p>
          <p className="mt-4 font-mono text-xs text-ink-secondary">
            Last updated <time dateTime={updated}>{updated}</time>
          </p>
        </header>

        <section aria-labelledby="stores-heading" className="mt-10">
          <h2 id="stores-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            What is stored in your browser
          </h2>
          <div className="mt-4 space-y-4 font-sans text-base leading-relaxed text-ink-secondary">
            <p>
              Your theme preference, always. Choosing light, dark, or system writes a single localStorage
              entry (key <code className="font-mono text-sm text-ink">rwm-theme</code>) so the page does not
              flash the wrong colours on your next visit. It never leaves your device, and clearing site data
              removes it.
            </p>
            <p>
              If you use the archive assistant (below), a second entry: an anonymous session token for the
              assistant&apos;s cloud sync (key prefix{' '}
              <code className="font-mono text-sm text-ink">aui:refresh_token:</code>), which keeps the same
              anonymous identity across visits so your threads stay listed. It contains no name, email, or
              anything you typed, and it expires after 30 days of no use. Clearing site data removes it and
              the next visit starts a fresh anonymous identity.
            </p>
            <p>
              There are no cookies. No session identifier, no consent banner, and no fingerprinting script.
            </p>
          </div>
        </section>

        <section aria-labelledby="collect-heading" className="mt-10">
          <h2 id="collect-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            What is not collected
          </h2>
          <ul className="mt-4 space-y-3 font-sans text-base leading-relaxed text-ink-secondary">
            <li>
              <strong className="font-semibold text-ink">No analytics.</strong> The site ships zero third-party
              scripts, so there is no page-view counter, heat map, or session recording.
            </li>
            <li>
              <strong className="font-semibold text-ink">No advertising or trackers.</strong> Nothing on the
              page follows you to another site.
            </li>
            <li>
              <strong className="font-semibold text-ink">No accounts.</strong> You cannot sign in, because
              there is nothing to sign in to.
            </li>
            <li>
              <strong className="font-semibold text-ink">No search queries sent anywhere.</strong> The index
              is generated at build time and searched in your browser; typing in the box does not hit a server.
            </li>
          </ul>
        </section>

        <section aria-labelledby="assistant-heading" className="mt-10 border-t border-line pt-10">
          <h2 id="assistant-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            The archive assistant
          </h2>
          <div className="mt-4 space-y-4 font-sans text-base leading-relaxed text-ink-secondary">
            <p>
              The <Link href="/assistant" className="text-brand underline underline-offset-4 hover:text-brand-pressed">assistant page</Link>{' '}
              builds every answer on your device from the same build-time index as search — the answers are
              quoted from the published essays, not generated by a model. But the conversation itself is
              synced to the cloud so the author can see what readers ask and improve the essays.
            </p>
            <p>
              Concretely: when you send a message there, your question, the quoted answer, thread titles, and
              run metadata (duration, outcome — not a model report, since there is no model) are stored in the
              author&apos;s project on Assistant Cloud, the hosted backend for the assistant-ui library this
              site uses. Simple engagement events (sent, stopped, copied) are recorded without message text.
              A thread-naming assistant on that service reads a thread&apos;s first message to title it.
            </p>
            <p>
              No account is involved: the browser holds an anonymous identity created on first use, with no
              name, email, or password behind it, and nothing ties it to you beyond that random identity.
              Everything search-related stays exactly as before — typing in the search box never hits a
              server.
            </p>
          </div>
        </section>

        <section aria-labelledby="hosting-heading" className="mt-10">
          <h2 id="hosting-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            What the hosting provider sees
          </h2>
          <div className="mt-4 space-y-4 font-sans text-base leading-relaxed text-ink-secondary">
            <p>
              The site runs on Cloudflare Workers, which necessarily processes the request it is answering:
              IP address, user agent, requested URL, and timestamp, kept in operational logs for security and
              abuse handling under Cloudflare&apos;s own policy. That happens at the edge, before this
              application runs, and no application-level database records it.
            </p>
            <p>
              Fonts are self-hosted, so no font request leaves for a third party. Feeds and the sitemap are
              static files.
            </p>
          </div>
        </section>

        <section aria-labelledby="choices-heading" className="mt-10">
          <h2 id="choices-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            Your choices
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed text-ink-secondary">
            Clearing site data resets the theme preference and removes the assistant&apos;s anonymous
            identity (the next assistant visit starts a fresh one). If you do not want conversations synced
            at all, use{' '}
            <Link href="/search" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              search
            </Link>{' '}
            instead of the assistant — it is fully on-device. Blocking scripts still leaves the site
            readable: every page is server-rendered HTML, and search works without JavaScript. If you would
            rather not touch a browser at all, the{' '}
            <Link href="/rss.xml" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              RSS feed
            </Link>{' '}
            and{' '}
            <Link href="/feed.json" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              JSON Feed
            </Link>{' '}
            carry the full text of every essay.
          </p>
        </section>

        <section aria-labelledby="questions-heading" className="mt-10 border-t border-line pt-8">
          <h2 id="questions-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            Questions or corrections
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed text-ink-secondary">
            Write to {AUTHOR.name} through the channels on the{' '}
            <Link href="/contact" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              contact page
            </Link>
            . If a future change to the site affects this policy, this page is updated in the same commit and
            the date above moves with it. Security reports belong in the private advisory form listed in{' '}
            <a
              href="/.well-known/security.txt"
              className="text-brand underline underline-offset-4 hover:text-brand-pressed"
            >
              security.txt
            </a>
            , not in a public thread ({' '}
            <a
              href={CONTACT.advisories}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand underline underline-offset-4 hover:text-brand-pressed"
            >
              opens in a new tab
            </a>
            ).
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
