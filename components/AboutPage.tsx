import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import SectionNavigation from '@/components/layout/SectionNavigation';
import { Card, Text, Link as TextLink } from '@/components/primitives';

const aboutSections = [
  { id: 'mission-heading', label: 'Editorial mission and diamond open access' },
  { id: 'verification-heading', label: 'Specialist verification and review standards' },
  { id: 'representative-heading', label: 'Representative reviews across disciplines' },
  { id: 'governance-heading', label: 'Corrections, ethics, and correspondence' },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-8">
          <Text as="p" variant="eyebrow" color="brand" weight="semibold">
            Colophon &amp; Institutional Charter
          </Text>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            About ResearchWithMe
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary">
            An independent diamond open-access publication where verified domain specialists deconstruct peer-reviewed
            papers, empirical datasets, and open-source engineering repositories.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="order-1 self-start lg:sticky lg:top-24 lg:col-start-2 lg:order-2">
            <SectionNavigation items={aboutSections} ariaLabel="About page sections" />
          </div>
          <div data-layout-content="reading" className="order-2 min-w-0 max-w-[48rem] space-y-10 lg:order-1 font-sans text-base leading-relaxed text-ink">
            <section aria-labelledby="mission-heading" className="space-y-4">
              <Text id="mission-heading" as="h2" variant="section-title">
                Editorial mission and diamond open access
              </Text>
              <p className="text-ink-secondary">
                Modern technical literature moves faster than traditional journal review cycles, yet informal commentary
                rarely preserves reproducible citations or verifiable reviewer credentials. ResearchWithMe bridges that
                gap by publishing structured, citable technical reviews, benchmark replications, and repository teardowns
                under Creative Commons Attribution 4.0 International (CC BY 4.0) with zero reader paywalls and zero
                article processing charges.
              </p>
              <p className="text-ink-secondary">
                Every published review links directly to its primary scholarly artifact—whether an arXiv preprint, a
                clinical trial registry record, or a tagged GitHub release—and pairs narrative critique with formal
                bibliographic metadata in the{' '}
                <TextLink href="/papers" >
                  indexed paper archive
                </TextLink>{' '}
                and printable{' '}
                <TextLink href="/editions" >
                  quarterly PDF editions
                </TextLink>
                .
              </p>
            </section>

            <section aria-labelledby="verification-heading" className="space-y-4 border-t border-line pt-8">
              <Text id="verification-heading" as="h2" variant="section-title">
                Specialist verification and review standards
              </Text>
              <p className="text-ink-secondary">
                Bylines in the{' '}
                <TextLink href="/authors" >
                  contributors and specialists directory
                </TextLink>{' '}
                require cryptographic or institutional provenance: ORCID iDs for academic researchers, verified repository
                maintainership on GitHub for systems engineers, or institutional domain attestation overseen by our{' '}
                <TextLink href="/editorial-board" >
                  independent editorial board
                </TextLink>
                .
              </p>
              <p className="text-ink-secondary">
                Readers can audit claims interactively with the{' '}
                <TextLink href="/assistant" >
                  research synthesis assistant
                </TextLink>
                , export formatted BibTeX, RIS, APA, MLA, and Chicago references from the{' '}
                <TextLink href="/cite" >
                  citation builder
                </TextLink>
                , and curate offline bibliographies in their local{' '}
                <TextLink href="/bookmarks" >
                  saved reading list
                </TextLink>{' '}
                without creating an account.
              </p>
            </section>

            <section aria-labelledby="representative-heading" className="space-y-4 border-t border-line pt-8">
              <Text id="representative-heading" as="h2" variant="section-title">
                Representative reviews across disciplines
              </Text>
              <p className="text-ink-secondary">
                Our editorial columns span systems engineering, life sciences, organizational sociology, and open-science
                economics. Recent peer reviews and repository teardowns include:
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                <Card as="li">
                  <Link
                    href="/post/inside-vllm-and-paged-attention"
                    className="font-serif text-lg font-semibold text-ink hover:text-brand"
                  >
                    Inside vLLM &amp; PagedAttention
                  </Link>
                  <p className="mt-1 font-sans text-xs text-ink-secondary">
                    Systems teardown of virtual memory paging for high-throughput LLM serving.
                  </p>
                </Card>
                <Card as="li">
                  <Link
                    href="/post/why-we-migrated-from-k8s-to-nomad-and-bare-metal"
                    className="font-serif text-lg font-semibold text-ink hover:text-brand"
                  >
                    Migrating from Kubernetes to Nomad &amp; Bare Metal
                  </Link>
                  <p className="mt-1 font-sans text-xs text-ink-secondary">
                    Two-year infrastructure post-mortem on cluster scheduling and cost telemetry.
                  </p>
                </Card>
                <Card as="li">
                  <Link
                    href="/post/crispr-cas12f-miniaturization-delivery-bottlenecks"
                    className="font-serif text-lg font-semibold text-ink hover:text-brand"
                  >
                    CRISPR-Cas12f Miniaturization &amp; AAV Delivery
                  </Link>
                  <p className="mt-1 font-sans text-xs text-ink-secondary">
                    Molecular biology review of compact endonucleases for in vivo gene editing.
                  </p>
                </Card>
                <Card as="li">
                  <Link
                    href="/post/the-hidden-tax-on-open-science-commercial-apcs"
                    className="font-serif text-lg font-semibold text-ink hover:text-brand"
                  >
                    The Hidden Tax on Open Science APCs
                  </Link>
                  <p className="mt-1 font-sans text-xs text-ink-secondary">
                    Empirical policy audit of $2.4B in public research grants paid to commercial publishers.
                  </p>
                </Card>
                <Card as="li">
                  <Link
                    href="/post/async-first-is-broken-when-meetings-become-slack-anxiety"
                    className="font-serif text-lg font-semibold text-ink hover:text-brand"
                  >
                    When Async-First Becomes 24/7 Chat Fragmentation
                  </Link>
                  <p className="mt-1 font-sans text-xs text-ink-secondary">
                    Sociological analysis of narrative decision protocols in distributed research teams.
                  </p>
                </Card>
                <Card as="li">
                  <Link
                    href="/post/deconstructing-deepseek-r1-reasoning-without-sft"
                    className="font-serif text-lg font-semibold text-ink hover:text-brand"
                  >
                    Deconstructing Pure RL Reasoning Models
                  </Link>
                  <p className="mt-1 font-sans text-xs text-ink-secondary">
                    Replication notes on reinforcement learning incentives for chain-of-thought verification.
                  </p>
                </Card>
              </ul>
            </section>

            <section aria-labelledby="governance-heading" className="space-y-3 border-t border-line pt-8">
              <Text id="governance-heading" as="h2" variant="section-title">
                Corrections, ethics, and correspondence
              </Text>
              <p className="text-ink-secondary">
                Substantive methodological corrections are appended directly to the canonical record with a timestamped
                editorial note rather than silently overwritten. To propose a review, report an erratum, or inspect our
                data-handling guarantees, visit the{' '}
                <TextLink href="/contact" >
                  editorial contact office
                </TextLink>{' '}
                or read our{' '}
                <TextLink href="/privacy" >
                  reader privacy policy
                </TextLink>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
