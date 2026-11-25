'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ListTree } from 'lucide-react';
import type { TocEntry } from '@/lib/content/toc';

/**
 * A compact, collapsible reading map. The list is open in server-rendered HTML
 * so section links work before hydration; the observer only adds the active
 * section state once the reader starts moving through the article.
 */
export default function TocNav({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string | null>(entries[0]?.id ?? null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-112px 0px -68% 0px', threshold: [0, 1] },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <nav
      aria-labelledby="toc-heading"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
            <ListTree className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Reading guide
            </p>
            <h2 id="toc-heading" className="mt-0.5 font-serif text-lg font-semibold leading-tight text-card-foreground">
              On this page
            </h2>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="toc-sections"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span>{entries.length} sections</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <ul
        id="toc-sections"
        className={`grid gap-2 border-t border-border bg-muted/40 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 ${expanded ? '' : 'hidden'}`}
      >
        {entries.map((entry, index) => {
          const isActive = active === entry.id;
          return (
            <li key={entry.id} className={entry.level === 3 ? 'sm:pl-3 lg:pl-4' : undefined}>
              <a
                href={`#${entry.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={`group flex min-h-14 items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  isActive
                    ? 'border-primary/40 bg-background text-foreground shadow-xs'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 font-mono text-[0.6875rem] font-semibold tabular-nums ${
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-medium leading-snug">{entry.text}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
