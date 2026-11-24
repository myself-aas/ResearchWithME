import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Crumb } from '@/lib/seo/jsonld';

/**
 * The visible breadcrumb trail. Pages pass the same array to
 * `breadcrumbJsonLd`, so the markup and the structured data cannot drift.
 */
export default function Breadcrumbs({
  crumbs,
  className = '',
}: {
  crumbs: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`font-mono text-xs text-ink-secondary ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <li key={`${crumb.name}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
              {isCurrent ? (
                <span aria-current="page" className="max-w-[22rem] truncate text-ink">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.href ?? '/'} className="hover:text-ink hover:underline">
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
