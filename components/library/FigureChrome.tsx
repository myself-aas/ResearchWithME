import type { ReactNode } from 'react';

/**
 * Shared chrome for every figure in the library (Constitution Article 4).
 *
 * All interactive figures render the same outer contract: a bordered
 * `<figure>` with a captioned header, one body, and an optional footer strip.
 * The assistant's `FigureFrame` strips exactly this chrome in-thread via
 * `[&>figure]` overrides, so a component needs no variants to work on both
 * surfaces. Exported control classes keep buttons and sliders identical
 * across the library and inside the articles that adopt it.
 */

export const PRIMARY_BUTTON =
  'inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 py-2.5 font-sans text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

export const SECONDARY_BUTTON =
  'inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-2.5 font-sans text-sm font-medium text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

export const RANGE_CLASS = 'h-2 w-full accent-[var(--color-brand)]';

export const READOUT_CLASS = 'font-mono text-xs text-ink-secondary';

export default function FigureChrome({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <figcaption className="font-sans text-sm font-semibold text-ink">{title}</figcaption>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">{subtitle}</p>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
    </figure>
  );
}
