import Link from 'next/link';
import { Rss } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { AUTHOR, NAV, SITE } from '@/lib/site';

const elsewhere = AUTHOR.links;

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" aria-label={`${SITE.name} — home`} className="inline-flex rounded-sm">
            <BrandLogo size="md" />
          </Link>
          <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink-secondary">
            {SITE.description}
          </p>
          <p className="mt-4 font-mono text-xs text-ink-secondary">
            Written by {AUTHOR.name}
          </p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink">
            Explore
          </h2>
          <ul className="mt-3 space-y-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-sans text-sm text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/contact"
                className="font-sans text-sm text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Contact
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="font-sans text-sm text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Privacy
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-elsewhere">
          <h2 id="footer-elsewhere" className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink">
            Elsewhere
          </h2>
          <ul className="mt-3 space-y-2">
            {elsewhere.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                  className="inline-flex items-center gap-2 font-sans text-sm text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  {link.label === 'RSS' && <Rss className="h-3.5 w-3.5" aria-hidden="true" />}
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 font-mono text-xs text-ink-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {year} {AUTHOR.name}. Essays are licensed{' '}
            <a
              href={SITE.licenseUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-4 hover:text-ink"
            >
              {SITE.license}
            </a>
            .
          </p>
          <p>Written in MDX · Built with Next.js</p>
        </div>
      </div>
    </footer>
  );
}
