import Link from 'next/link';

const NETWORK_SURFACES = [
  { href: '/feed', label: 'Research Feed', desc: 'Mixed reviews, replications, and tool evaluations' },
  { href: '/sources', label: 'Canonical Sources', desc: 'Versioned DOI, arXiv, and repository records' },
  { href: '/evidence', label: 'Evidence & Claims', desc: 'Locator-grounded observations and claim links' },
  { href: '/tools', label: 'Open-Source Tools', desc: 'Deduplicated repositories with license metadata' },
  { href: '/editor', label: 'MDX Workspace', desc: '13-block scholarly editor with offline autosave' },
  { href: '/research-os', label: 'Research OS', desc: 'Continue Working, Attention Queue, and Goals' },
] as const;

/**
 * Part I §6.1 / §23 / §25 — Bridges the public editorial front page (`/`)
 * directly into the ResearchWithME v3.4 Research Contribution Network.
 */
export function ResearchNetworkBridge() {
  return (
    <section
      aria-label="Research Contribution Network"
      className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <div className="max-w-2xl space-y-1">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
              Research Contribution Network · v3.4
            </p>
            <h2 className="font-serif text-xl font-bold text-ink sm:text-2xl">
              Shape the open knowledge record — not just read it
            </h2>
            <p className="text-sm text-ink-secondary">
              Attach locator-grounded evidence, link claims to immutable source versions, evaluate
              open-source research tools, or open the multi-pane Scholarly MDX Workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contribute"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
            >
              Start a Contribution →
            </Link>
            <Link
              href="/feed"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-canvas px-4 py-2 text-sm font-medium text-ink hover:border-brand"
            >
              Explore Research Feed
            </Link>
          </div>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NETWORK_SURFACES.map((surface) => (
            <li key={surface.href}>
              <Link
                href={surface.href}
                className="block h-full rounded-xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand"
              >
                <span className="block font-serif text-sm font-semibold text-ink">
                  {surface.label}
                </span>
                <span className="mt-1 block text-xs text-ink-secondary">{surface.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
