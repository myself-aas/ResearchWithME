import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { Card, Text, Link as TextLink } from '@/components/primitives';

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-8">
          <Text as="p" variant="eyebrow" color="brand" weight="semibold">
            Contact
          </Text>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Get in touch
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary">
            Channels for pitches, corrections, contributor verification, and security disclosure.
          </p>
        </header>

        <div className="mt-10 space-y-10 font-sans text-base leading-relaxed text-ink">
          <section aria-labelledby="desks-heading" className="grid gap-6 sm:grid-cols-2">
            <h2 id="desks-heading" className="sr-only">
              Contact channels
            </h2>

            <Card padding="xl">
              <Text as="p" variant="eyebrow" color="brand" weight="semibold">
                Pitches &amp; submissions
              </Text>
              <Text as="h3" variant="card-title" className="mt-2">Editor</Text>
              <p className="mt-2 text-sm text-ink-secondary">
                Pitch technical reviews, benchmark replications, or repository teardowns. Include the target paper,
                dataset, or repository reference and a short note on your relevant work.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:editor@researchwith.me" className="text-brand underline underline-offset-4">
                  editor@researchwith.me
                </a>
              </p>
            </Card>

            <Card padding="xl">
              <Text as="p" variant="eyebrow" color="brand" weight="semibold">
                Corrections
              </Text>
              <Text as="h3" variant="card-title" className="mt-2">Errata</Text>
              <p className="mt-2 text-sm text-ink-secondary">
                Report factual inaccuracies, broken artifact links, or citation metadata discrepancies in any
                published review.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:corrections@researchwith.me" className="text-brand underline underline-offset-4">
                  corrections@researchwith.me
                </a>
              </p>
            </Card>

            <Card padding="xl">
              <Text as="p" variant="eyebrow" color="brand" weight="semibold">
                Metadata &amp; feeds
              </Text>
              <Text as="h3" variant="card-title" className="mt-2">Catalog</Text>
              <p className="mt-2 text-sm text-ink-secondary">
                Questions about the OpenAPI catalog feeds, BibTeX/RIS exports, or the Markdown /llms.txt index.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:archive@researchwith.me" className="text-brand underline underline-offset-4">
                  archive@researchwith.me
                </a>
              </p>
            </Card>

            <Card padding="xl">
              <Text as="p" variant="eyebrow" color="brand" weight="semibold">
                RFC 9116 disclosure
              </Text>
              <Text as="h3" variant="card-title" className="mt-2">Security</Text>
              <p className="mt-2 text-sm text-ink-secondary">
                Report platform vulnerabilities or identity-verification issues under coordinated disclosure. See our
                machine-readable{' '}
                <a href="/.well-known/security.txt" className="text-brand underline underline-offset-4">
                  security.txt policy
                </a>
                .
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:security@researchwith.me" className="text-brand underline underline-offset-4">
                  security@researchwith.me
                </a>
              </p>
            </Card>
          </section>

          <section aria-labelledby="process-heading" className="space-y-4 border-t border-line pt-8">
            <Text id="process-heading" as="h2" variant="section-title">
              Response timelines
            </Text>
            <p className="text-ink-secondary">
              Incoming mail is reviewed Monday through Friday (UTC). Errata affecting published empirical claims or
              citation records are triaged within 48 hours and logged with a timestamped correction note on the
              affected article.
            </p>
            <p className="text-ink-secondary">
              If you wish to write for ResearchWithMe, read the{' '}
              <TextLink href="/about">about page</TextLink> for how writer verification works, and see the{' '}
              <TextLink href="/privacy">privacy policy</TextLink> for how contributor records are handled.
            </p>
          </section>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
