'use client';

import { useEffect, useState } from 'react';
import type { TocEntry } from '@/lib/content/toc';

/**
 * Sticky table of contents with an active-section indicator.
 *
 * The ids come from the same slugger `rehype-slug` uses, so the links work
 * without JavaScript; the observer only adds the current-section highlight.
 */
export default function TocNav({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string | null>(entries[0]?.id ?? null);

  useEffect(() => {
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
      { rootMargin: '-96px 0px -70% 0px', threshold: [0, 1] },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length < 2) return null;

  return (
    <nav aria-labelledby="toc-heading" className="text-sm">
      <h2
        id="toc-heading"
        className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-secondary"
      >
        On this page
      </h2>
      <ul className="mt-3 space-y-1.5 border-l border-line">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? 'pl-3' : undefined}>
            <a
              href={`#${entry.id}`}
              aria-current={active === entry.id ? 'location' : undefined}
              className={`block border-l-2 py-0.5 pl-3 leading-snug transition-colors ${
                active === entry.id
                  ? '-ml-px border-brand font-medium text-ink'
                  : '-ml-px border-transparent text-ink-secondary hover:border-brand/40 hover:text-ink'
              }`}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
