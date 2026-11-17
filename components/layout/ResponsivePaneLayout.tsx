'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import BottomSheet from './BottomSheet';

interface ResponsivePaneLayoutProps {
  /** Primary scrollable workspace / feed / document column. */
  main: ReactNode;
  /** Optional left rail (filters, outline, topics). Collapses to a BottomSheet below lg. */
  leftRail?: ReactNode;
  leftRailTitle?: string;
  /** Optional right inspector rail (evidence, trust dimensions, actions). */
  rightRail?: ReactNode;
  rightRailTitle?: string;
}

/**
 * Multi-pane layout primitive (v3.4 Part III §6.3):
 * - Mobile (< 768px): single-column main + BottomSheet triggers for rails
 * - Tablet (768–1023px): main + right rail, left rail via sheet
 * - Desktop (>= 1024px): full 2- or 3-pane grid with strict min-w-0 overflow protection
 */
export default function ResponsivePaneLayout({
  main,
  leftRail,
  leftRailTitle = 'Filters & Navigation',
  rightRail,
  rightRailTitle = 'Research Inspector',
}: ResponsivePaneLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const gridCols =
    leftRail && rightRail
      ? 'lg:grid-cols-[240px_minmax(0,1fr)_300px]'
      : leftRail
        ? 'lg:grid-cols-[260px_minmax(0,1fr)]'
        : rightRail
          ? 'md:grid-cols-[minmax(0,1fr)_300px]'
          : 'grid-cols-1';

  return (
    <div className="min-w-0">
      {(leftRail || rightRail) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
          {leftRail ? (
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 font-sans text-sm font-medium text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <SlidersHorizontal className="h-4 w-4 text-brand" aria-hidden="true" />
              <span>{leftRailTitle}</span>
            </button>
          ) : null}
          {rightRail ? (
            <button
              type="button"
              onClick={() => setRightOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 font-sans text-sm font-medium text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 text-brand" aria-hidden="true" />
              <span>{rightRailTitle}</span>
            </button>
          ) : null}
        </div>
      )}

      <div className={`grid min-w-0 gap-6 ${gridCols}`}>
        {leftRail ? (
          <aside aria-label={leftRailTitle} className="hidden min-w-0 lg:block">
            <div className="sticky top-20 space-y-5">{leftRail}</div>
          </aside>
        ) : null}

        <div className="min-w-0">{main}</div>

        {rightRail ? (
          <aside aria-label={rightRailTitle} className="hidden min-w-0 md:block">
            <div className="sticky top-20 space-y-5">{rightRail}</div>
          </aside>
        ) : null}
      </div>

      {leftRail ? (
        <BottomSheet open={leftOpen} onClose={() => setLeftOpen(false)} title={leftRailTitle}>
          {leftRail}
        </BottomSheet>
      ) : null}

      {rightRail ? (
        <BottomSheet open={rightOpen} onClose={() => setRightOpen(false)} title={rightRailTitle}>
          {rightRail}
        </BottomSheet>
      ) : null}
    </div>
  );
}
