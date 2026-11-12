import NextLink from 'next/link';
import { cx as cn } from './cx';

/**
 * Link — navigation primitive.
 *
 * Internal paths render `next/link` (client navigation + prefetch); external,
 * `mailto:`, `tel:` and in-page `#` hrefs render a plain anchor. Both runtime
 * targets resolve `next/link` (the Pages build aliases it to its compat shim).
 *
 * Variants are the link styles the product already uses, so migrating an
 * anchor to `<Link>` changes no pixels:
 *  - `inline`  — body-copy link (brand, underlined)
 *  - `quiet`   — chrome link that underlines on hover (footers, meta rows)
 *  - `muted`   — secondary-text nav link (footer columns)
 *  - `plain`   — no styling; the caller owns it (cards, buttons-as-links)
 *
 * Size and weight are inherited from context unless the variant names them.
 */

export type LinkVariant = 'inline' | 'quiet' | 'muted' | 'plain';

const VARIANT_CLASSES: Record<LinkVariant, string> = {
  inline: 'font-medium text-brand underline underline-offset-4 hover:text-brand-pressed',
  quiet: 'underline-offset-4 hover:text-ink hover:underline',
  muted: 'text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline',
  plain: '',
};

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Optional only for renderers (e.g. Markdown) that can emit an anchor without one. */
  href?: string;
  variant?: LinkVariant;
  /** next/link prefetch; ignored for external links. */
  prefetch?: boolean;
}

const isExternal = (href: string) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);

export function Link({ href, variant = 'inline', prefetch, className, children, ...props }: LinkProps) {
  const classes = cn(VARIANT_CLASSES[variant], className) || undefined;
  if (href === undefined || isExternal(href)) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} prefetch={prefetch} className={classes} {...props}>
      {children}
    </NextLink>
  );
}
