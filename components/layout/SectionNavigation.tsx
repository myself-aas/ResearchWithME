'use client';

/**
 * SectionNavigation — "On this page" rail for long reading surfaces.
 *
 * Now a scroll spy: an IntersectionObserver marks the section the reader is
 * inside, and the marker travels between entries with a shared-layout spring.
 *
 * Principles: 3 (staging — the rail shows where you are without competing with
 * the manuscript), 4 (pose to pose — the marker moves between poses instead of
 * blinking), 5 (follow-through — the spring carries the eye), 11 (solid
 * drawing — the rail keeps one silhouette at every position).
 *
 * Accessibility: `aria-current="location"` marks the active link, the marker
 * is decorative, and the markup degrades to a plain ordered list when the
 * observer or JavaScript is unavailable. The original link text, order, and
 * accessible name are unchanged.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { LayoutGroup } from 'motion/react';
import * as m from 'motion/react-m';
import { SPRING } from '@/lib/motion/tokens';
import { MotionBoundary } from '@/components/motion/MotionScope';

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const sectionKey = items.map((item) => item.id).join('|');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: [0, 0.25, 1] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // `sectionKey` captures the ids without depending on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  if (items.length === 0) return null;

  return (
    <MotionBoundary>
      <nav
        aria-label={ariaLabel}
        data-layout-rail="section-navigation"
        className="rounded-2xl border border-line bg-surface p-4 text-ink"
      >
        <h2 className="font-serif text-lg font-semibold text-ink">{heading}</h2>
        <LayoutGroup id={`section-nav-${ariaLabel}`}>
          <ol className="mt-3 space-y-2 font-sans text-sm">
            {items.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id} className="relative">
                  <a
                    href={`#${item.id}`}
                    aria-current={active ? 'location' : undefined}
                    className={`relative inline-flex min-h-11 w-full items-center gap-2 rounded-lg pl-3 text-ink-secondary underline decoration-line underline-offset-4 transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                      active ? 'text-ink' : ''
                    }`}
                  >
                    {active ? (
                      <m.span
                        layoutId={`section-nav-marker-${ariaLabel}`}
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand"
                        transition={{ layout: SPRING.layout }}
                      />
                    ) : null}
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ol>
        </LayoutGroup>
      </nav>
    </MotionBoundary>
  );
}
