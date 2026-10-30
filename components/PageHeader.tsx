import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** The page's single h1. */
  title: ReactNode;
  /** One paragraph of orientation under the title. */
  description?: ReactNode;
  /** Optional callout shown under the description, inside the header rule. */
  children?: ReactNode;
}

/**
 * The masthead for archive, tool, and form surfaces: one heading measure, one
 * lede, one closing rule. Keeping it here stops each page from inventing its
 * own type sizes and padding for the same three elements.
 */
export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="border-b border-stone-200 pb-8">
      <h1 className="max-w-4xl font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-stone-700">{description}</p>
      ) : null}
      {children ? <div className="mt-4 max-w-[60ch]">{children}</div> : null}
    </header>
  );
}
