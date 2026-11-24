import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bug, Github, ShieldCheck } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { pageMetadata } from '@/lib/seo';
import { jsonLdScript, webPageJsonLd } from '@/lib/seo/jsonld';
import { AUTHOR, CONTACT, SITE } from '@/lib/site';

const description =
  'How to reach the writer of ResearchWithMe: corrections and essay responses through GitHub, security reports through advisories, and what happens to each message.';

export const metadata: Metadata = pageMetadata({
  title: 'Contact',
  description,
  path: '/contact',
});

const channels = [
  {
    icon: Bug,
    title: 'Corrections and responses',
    body: 'If an essay is wrong, cite the line and the source. The fastest route is an issue on the repository, which keeps the correction next to the file it applies to.',
    href: `${CONTACT.issues}/new`,
    label: 'Open an issue',
  },
  {
    icon: Github,
    title: 'Everything else',
    body: 'Questions, review requests, and disagreements are welcome on GitHub. There is no newsletter, no mailing list, and no form that quietly stores your address.',
    href: CONTACT.profile,
    label: 'GitHub profile',
  },
  {
    icon: ShieldCheck,
    title: 'Security reports',
    body: 'Do not open a public issue for a vulnerability. Use the private advisory form, which is also what /.well-known/security.txt points at.',
    href: CONTACT.advisories,
    label: 'Private advisory',
  },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            webPageJsonLd({ name: 'Contact', description, path: '/contact', type: 'ContactPage' }),
          ),
        }}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-5 pb-8 pt-12 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-10">
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">Contact</p>
          <h1 className="mt-3 max-w-3xl font-serif text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-ink text-balance">
            Reach the person who wrote this.
          </h1>
          <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-ink-secondary">
            {SITE.name} is written by one person, {AUTHOR.name}, and there is no support desk behind it.
            Messages arrive as GitHub notifications, which means the honest answer about response time is:
            it depends on the week.
          </p>
        </header>

        <section aria-labelledby="channels-heading" className="mt-10">
          <h2 id="channels-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            Where to send what
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <li key={channel.title} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                  <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
                  <h3 className="mt-3 font-sans text-base font-semibold text-ink">{channel.title}</h3>
                  <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-ink-secondary">{channel.body}</p>
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4 inline-flex items-center gap-1 font-sans text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
                  >
                    {channel.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="detail-heading" className="mt-12 border-t border-line pt-8">
          <h2 id="detail-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            What makes a message easy to answer
          </h2>
          <div className="mt-4 space-y-4 font-sans text-base leading-relaxed text-ink-secondary">
            <p>
              For a correction, include the essay URL, the sentence, and the primary source that contradicts
              it. Corrections that arrive with a source get applied and dated; corrections without one usually
              turn into a longer conversation.
            </p>
            <p>
              For a review request, say what the work claims and what you want checked. I read papers and
              repositories closely, which takes time, so not every request becomes an essay.
            </p>
            <p>
              For anything about the code, the repository is the right place: the site is an MDX blog with no
              database and no accounts, so there is no private data to discuss in a channel.
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy-heading" className="mt-12 border-t border-line pt-8">
          <h2 id="privacy-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
            What happens to your message
          </h2>
          <p className="mt-4 font-sans text-base leading-relaxed text-ink-secondary">
            Nothing is stored here. The site has no database, no contact form, and no analytics, so a message
            lives wherever you sent it: a GitHub thread, an advisory, or your own mail client. The{' '}
            <Link href="/privacy" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              privacy page
            </Link>{' '}
            lists the small amount this site does keep, and the{' '}
            <Link href="/about" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              about page
            </Link>{' '}
            explains what gets published and under which licence.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
