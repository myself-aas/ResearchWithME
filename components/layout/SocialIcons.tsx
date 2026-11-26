import { Globe, Rss } from 'lucide-react';
import { AUTHOR } from '@/lib/site';

/**
 * Brand icons for the author's social profiles, rendered wherever the
 * author's links appear: the site footer, the about page, and the article
 * author card. Icons are resolved from the link itself (host in `href`,
 * falling back to the label), so adding an entry to `AUTHOR.links` is all
 * an integration needs — this component never needs editing for a new
 * host we already know, and unknown hosts get a neutral globe.
 *
 * Brand marks are inline SVG paths (GitHub, LinkedIn, X, Bluesky, ORCID);
 * generic destinations use lucide. Everything inherits `currentColor`, so
 * the tomato brand hover comes from the CSS token, not per-icon colors.
 */

const BRAND_PATHS = {
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  bluesky:
    'M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.469.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.38-3.364.248-.818.624-5.778.624-6.468 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8',
  orcid:
    'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.673 0 12 0zM5.716 3.603c.914 0 1.66.746 1.66 1.661 0 .915-.746 1.66-1.66 1.66-.915 0-1.66-.745-1.66-1.66 0-.915.746-1.661 1.66-1.661zM4.188 8.597h3.063v11.798H4.188V8.597zm5.436 0h2.933v1.611h.043c.409-.775 1.408-1.592 2.898-1.592 3.099 0 3.672 2.039 3.672 4.69v6.089h-3.06v-5.399c0-1.288-.024-2.943-1.794-2.943-1.795 0-2.069 1.402-2.069 2.85v5.492H9.624V8.597z',
} as const;

function BrandMark({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className ?? 'h-4 w-4'}>
      <path d={path} />
    </svg>
  );
}

/** The icon for one social link — resolved from the href host, then the label. */
export function socialIconFor(label: string, href: string, className?: string) {
  const target = `${label} ${href}`.toLowerCase();
  const cls = className ?? 'h-4 w-4';
  if (target.includes('github.com') || target.includes('github ')) return <BrandMark path={BRAND_PATHS.github} className={cls} />;
  if (target.includes('linkedin')) return <BrandMark path={BRAND_PATHS.linkedin} className={cls} />;
  if (target.includes('x.com') || target.includes('twitter.com') || target.trim() === 'x') return <BrandMark path={BRAND_PATHS.x} className={cls} />;
  if (target.includes('bsky.app') || target.includes('bluesky')) return <BrandMark path={BRAND_PATHS.bluesky} className={cls} />;
  if (target.includes('orcid')) return <BrandMark path={BRAND_PATHS.orcid} className={cls} />;
  if (target.includes('rss')) return <Rss className={cls} aria-hidden="true" />;
  return <Globe className={cls} aria-hidden="true" />;
}

/**
 * The icon link row for `AUTHOR.links`. External profiles open in a new tab
 * with `rel="me"` (they are the author's own identities); internal paths
 * (RSS) stay in place.
 */
export default function SocialIcons({ className }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      {AUTHOR.links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            aria-label={link.label}
            title={link.label}
            {...(link.href.startsWith('http') ? { target: '_blank', rel: 'me noreferrer noopener' } : {})}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {socialIconFor(link.label, link.href)}
          </a>
        </li>
      ))}
    </ul>
  );
}
