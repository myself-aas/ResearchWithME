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
            Editorial Correspondence
          </Text>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Contact the Editorial Office
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary">
            Direct channels for manuscript pitches, replication errata, institutional library indexing, and coordinated
            security disclosure.
          </p>
        </header>

        <div className="mt-10 space-y-10 font-sans text-base leading-relaxed text-ink">
          <section aria-labelledby="desks-heading" className="grid gap-6 sm:grid-cols-2">
            <h2 id="desks-heading" className="sr-only">
              Editorial desks
            </h2>

            <Card padding="xl">
              <Text as="p" variant="eyebrow" color="brand" weight="semibold">
                Submissions &amp; Peer Review
              </Text>
              <Text as="h3" variant="card-title" className="mt-2">Editorial Desk</Text>
              <p className="mt-2 text-sm text-ink-secondary">
                Pitch technical paper reviews, benchmark replications, or repository teardowns. Include the target DOI
                or repository commit hash and your domain credentials.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:editorial@researchwith.me" className="text-brand underline underline-offset-4">
                  editorial@researchwith.me
                </a>
              </p>
            </Card>

            <Card padding="xl">
              <Text as="p" variant="eyebrow" color="brand" weight="semibold">
                Errata &amp; Replications
              </Text>
              <Text as="h3" variant="card-title" className="mt-2">Corrections Committee</Text>
              <p className="mt-2 text-sm text-ink-secondary">
                Report factual inaccuracies, broken artifact links, citation metadata discrepancies, or conflicting
                experimental reproductions in any published review.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:corrections@researchwith.me" className="text-brand underline underline-offset-4">
                  corrections@researchwith.me
                </a>
              </p>
            </Card>

            <Card padding="xl">
              <Text as="p" variant="eyebrow" color="brand" weight="semibold">
                Libraries &amp; Open Metadata
              </Text>
              <Text as="h3" variant="card-title" className="mt-2">Archival Indexing</Text>
              <p className="mt-2 text-sm text-ink-secondary">
                Questions regarding ISSN 2994-0821 harvesting, OpenAPI 3.1 catalog feeds, BibTeX/RIS bulk exports, or
                quarterly print-ready compendiums.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:archive@researchwith.me" className="text-brand underline underline-offset-4">
                  archive@researchwith.me
                </a>
              </p>
            </Card>

            <Card padding="xl">
              <Text as="p" variant="eyebrow" color="brand" weight="semibold">
                RFC 9116 Disclosure
              </Text>
              <Text as="h3" variant="card-title" className="mt-2">Security &amp; Abuse</Text>
              <p className="mt-2 text-sm text-ink-secondary">
                Report platform vulnerabilities or credential-verification issues under coordinated disclosure. See our
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
              Response timelines and contributor onboarding
            </Text>
            <p className="text-ink-secondary">
              The editorial collective reviews incoming correspondence Monday through Friday (UTC). Errata affecting
              published empirical figures or bibliography records in the{' '}
              <TextLink href="/papers" >
                paper archive
              </TextLink>{' '}
              are triaged within 48 hours and logged alongside our{' '}
              <TextLink href="/editorial-board" >
                editorial board governance standards
              </TextLink>
              .
            </p>
            <p className="text-ink-secondary">
              Researchers and open-source maintainers who wish to join our{' '}
              <TextLink href="/authors" >
                verified contributor roster
              </TextLink>{' '}
              can read more{' '}
              <TextLink href="/about" >
                about ResearchWithMe
              </TextLink>{' '}
              and review how contributor records are handled in our{' '}
              <TextLink href="/privacy" >
                privacy policy
              </TextLink>
              .
            </p>
          </section>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
