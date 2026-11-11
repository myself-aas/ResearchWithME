import type { ReactElement } from 'react';

export interface SectionNavigationItem {
  id: string;
  label: string;
}

export interface SectionNavigationProps {
  items: readonly SectionNavigationItem[];
  ariaLabel: string;
  heading?: string;
}

export default function SectionNavigation({
  items,
  ariaLabel,
  heading = 'On this page',
}: SectionNavigationProps): ReactElement | null {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      data-layout-rail="section-navigation"
      className="rounded-sm border border-line bg-surface p-4 text-ink"
    >
      <h2 className="font-serif text-lg font-semibold text-ink">{heading}</h2>
      <ol className="mt-3 space-y-2 font-sans text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-flex min-h-6 w-full items-center rounded-sm text-ink-secondary underline decoration-line underline-offset-4 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
