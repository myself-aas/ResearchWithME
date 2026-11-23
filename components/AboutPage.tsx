import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import SectionNavigation from '@/components/layout/SectionNavigation';
import { Text, Link as TextLink } from '@/components/primitives';

const aboutSections = [
  { id: 'mission-heading', label: 'Mission' },
  { id: 'verification-heading', label: 'Writer verification' },
  { id: 'reuse-heading', label: 'Open access and reuse' },
  { id: 'governance-heading', label: 'Corrections, ethics, and correspondence' },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />

      <main tabIndex={-1} id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-8">
          <Text as="p" variant="eyebrow" color="brand" weight="semibold">
            About
          </Text>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            About ResearchWithMe
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary">
            An independent publication where contributors with verifiable identities write open-access technical
            reviews, benchmark replications, and repository teardowns.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="order-1 self-start lg:sticky lg:top-24 lg:col-start-2 lg:order-2">
            <SectionNavigation items={aboutSections} ariaLabel="About page sections" />
          </div>
          <div data-layout-content="reading" className="order-2 min-w-0 max-w-[48rem] space-y-10 lg:order-1 font-sans text-base leading-relaxed text-ink">
            <section aria-labelledby="mission-heading" className="space-y-4">
              <Text id="mission-heading" as="h2" variant="section-title">
                Mission
              </Text>
              <p className="text-ink-secondary">
                Modern technical literature moves faster than traditional journal review cycles, yet informal commentary
                rarely preserves reproducible citations or verifiable contributor credentials. ResearchWithMe bridges
                that gap by publishing structured, citable technical reviews, benchmark replications, and repository
                teardowns under Creative Commons Attribution 4.0 International (CC BY 4.0) with no reader paywalls and
                no article processing charges.
              </p>
              <p className="text-ink-secondary">
                Every published review links directly to its primary artifact—whether a preprint, a clinical trial
                registry record, or a tagged source-code release—and pairs narrative critique with citable metadata.
              </p>
            </section>

            <section aria-labelledby="verification-heading" className="space-y-4 border-t border-line pt-8">
              <Text id="verification-heading" as="h2" variant="section-title">
                Writer verification
              </Text>
              <p className="text-ink-secondary">
                Bylines in the{' '}
                <TextLink href="/authors">writers directory</TextLink>{' '}
                require verifiable identity: an ORCID iD linked to the writer&apos;s published record, confirmed
                maintainership of the GitHub repository under review, or other public identity evidence reviewed by
                the editor before publishing access is granted.
              </p>
              <p className="text-ink-secondary">
                Readers can audit claims interactively with the{' '}
                <TextLink href="/assistant">research assistant</TextLink>, export formatted BibTeX, RIS, APA, MLA, and
                Chicago references from the{' '}
                <TextLink href="/cite">citation builder</TextLink>, and curate offline bibliographies in their local{' '}
                <TextLink href="/bookmarks">reading list</TextLink> without creating an account.
              </p>
            </section>

            <section aria-labelledby="reuse-heading" className="space-y-4 border-t border-line pt-8">
              <Text id="reuse-heading" as="h2" variant="section-title">
                Open access and reuse
              </Text>
              <p className="text-ink-secondary">
                All ResearchWithMe articles are published under CC BY 4.0. You may copy, distribute, and adapt the
                work for any purpose, including commercially, provided you give appropriate credit, link to the
                licence, and indicate if changes were made.
              </p>
              <p className="text-ink-secondary">
                We publish continuously, not in issues, and we do not issue our own ISSNs, ISBNs, or DOIs. Where an
                article reviews a work that carries its own persistent identifier, that identifier links to the
                primary record, not to a ResearchWithMe-minted handle.
              </p>
            </section>

            <section aria-labelledby="governance-heading" className="space-y-3 border-t border-line pt-8">
              <Text id="governance-heading" as="h2" variant="section-title">
                Corrections, ethics, and correspondence
              </Text>
              <p className="text-ink-secondary">
                Substantive methodological corrections are appended directly to the article with a timestamped editor
                note rather than silently overwritten. To propose a review, report an erratum, or inspect our data
                handling, visit the{' '}
                <TextLink href="/contact">contact page</TextLink> or read our{' '}
                <TextLink href="/privacy">privacy policy</TextLink>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
