"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import type { SearchDoc } from "@/lib/content/types";
import { formatDateShort, readingTimeLabel } from "@/lib/content/format";

const MAX_RESULTS = 20;

/**
 * Client-side search over the build-time index.
 *
 * The index is a small JSON payload generated from the MDX files, so search
 * runs instantly with no API route, no database, and no network round-trip.
 */
export default function SearchClient({
  docs,
  initialQuery = "",
}: {
  docs: SearchDoc[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [query]);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        includeScore: true,
        threshold: 0.34,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: "title", weight: 0.5 },
          { name: "description", weight: 0.22 },
          { name: "tags", weight: 0.18 },
          { name: "text", weight: 0.1 },
        ],
      }),
    [docs],
  );

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return docs.slice(0, 8);
    return fuse
      .search(trimmed, { limit: MAX_RESULTS })
      .map((result) => result.item);
  }, [docs, fuse, query]);

  const trimmed = query.trim();

  return (
    <div>
      <form role="search" action="/search" method="get">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-secondary"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, topics, and text…"
            aria-label="Search posts"
            autoComplete="off"
            className="h-14 w-full rounded-full border border-line bg-surface pl-12 pr-12 font-sans text-base text-ink placeholder:text-ink-secondary focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      <p
        className="mt-3 font-mono text-xs text-ink-secondary"
        aria-live="polite"
      >
        {trimmed
          ? `${results.length} ${results.length === 1 ? "result" : "results"} for “${trimmed}”`
          : `${docs.length} ${docs.length === 1 ? "essay" : "essays"} · newest first`}
      </p>

      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-serif text-xl font-semibold text-ink">
            Nothing matched that search.
          </p>
          <p className="mt-2 font-sans text-sm text-ink-secondary">
            Try a shorter phrase, a topic like “replication”, or browse the{" "}
            <Link
              href="/blog"
              className="text-brand underline underline-offset-4"
            >
              archive
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {results.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={doc.href}
                className="group grid gap-1 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-6"
              >
                <span className="font-mono text-xs text-ink-secondary">
                  {formatDateShort(doc.date)}
                  <span className="ml-2 sm:ml-0 sm:mt-1 sm:block">
                    {readingTimeLabel(doc.readingTimeMinutes)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block font-serif text-xl font-semibold leading-snug text-ink group-hover:text-brand">
                    {doc.title}
                  </span>
                  <span className="mt-1 block font-sans text-sm leading-relaxed text-ink-secondary">
                    {doc.description}
                  </span>
                  {doc.tags.length > 0 && (
                    <span className="mt-2 block font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                      {doc.tags
                        .slice(0, 4)
                        .map((tag) => `#${tag}`)
                        .join("  ")}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
