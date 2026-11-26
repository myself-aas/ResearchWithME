'use client';

import { useMemo, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { PRETRAINING_MONTHS, seasonFrame } from '@/lib/post/prithvi';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Season scrubber for the four-date pretraining sample.
 *
 * One range input scrubs a scene through a whole year — the surface colours
 * and the NDVI readout interpolate continuously — with the paper's four
 * sampled observation months (T1–T4, 1–6 months apart) pinned on the track.
 * The point the essay makes ("four observations span months, not four
 * adjacent days") becomes something the reader feels while dragging: the
 * scene at T1 and T3 is not a slightly shifted image, it is a different
 * landscape.
 *
 * Deterministic (`seasonFrame` in lib/post/prithvi.ts): same month, same
 * scene, every render — and it is the renderer behind the assistant's
 * `show_season_scrubber` generative-UI tool.
 */
export default function SeasonScrubber({ initialMonth = 5 }: { initialMonth?: number }) {
  const [month, setMonth] = useState(Math.min(Math.max(Math.round(initialMonth), 0), 11));
  const frame = useMemo(() => seasonFrame(month), [month]);

  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <figcaption className="font-sans text-sm font-semibold text-ink">
          Scrub the year: why four dates, not one
        </figcaption>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
          One pretraining sample is the same field seen four times across the year. Drag through
          the months and watch what a single-date model never gets to see.
        </p>
      </div>

      <div className="px-5 py-5">
        <div
          className="relative overflow-hidden rounded-xl border border-line"
          role="img"
          aria-label={`Illustrated field scene for ${frame.label}, NDVI ${frame.ndvi.toFixed(2)}`}
        >
          <svg viewBox="0 0 100 56" className="block w-full" aria-hidden="true">
            <rect width="100" height="56" fill={frame.land} />
            <path d="M0 30 22 14l20 12 18-9 22 14 18-8v33H0Z" fill={frame.field} />
            <path
              d="M-4 44c18-6 26-14 42-16s24 6 38 4 20-6 28-8"
              fill="none"
              stroke={frame.water}
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Field parcel lines keep the scene reading as agriculture. */}
            <path d="M10 20v30M34 16v34M58 22v28M80 18v32" stroke="white" strokeOpacity=".18" strokeWidth=".6" />
            <path d="M0 34h100M0 46h100" stroke="white" strokeOpacity=".12" strokeWidth=".6" />
          </svg>
          <div className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/35 px-3 py-1 font-mono text-xs text-white backdrop-blur-sm">
            {frame.label} · NDVI ≈ {frame.ndvi.toFixed(2)}
          </div>
        </div>

        <div className="mt-5">
          <label className="sr-only" htmlFor="season-scrubber-range">
            Month of year
          </label>
          <input
            id="season-scrubber-range"
            type="range"
            min={0}
            max={11}
            step={1}
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="h-2 w-full accent-[var(--color-brand)]"
            aria-valuetext={frame.label}
          />
          <ul className="mt-1 flex justify-between font-mono text-[0.625rem] uppercase tracking-wider text-ink-secondary" aria-hidden="true">
            {MONTH_LABELS.map((label) => (
              <li key={label} className={label === frame.label ? 'font-bold text-brand' : ''}>
                {label[0]}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-canvas p-3.5">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-ink-secondary">
            <MoveHorizontal className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            <span>The paper&apos;s four pretraining frames:</span>
            {PRETRAINING_MONTHS.map((m, index) => (
              <span
                key={m}
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  m === month ? 'bg-brand text-on-primary' : 'bg-selection text-brand'
                }`}
              >
                T{index + 1} · {MONTH_LABELS[m]}
              </span>
            ))}
          </p>
          <p aria-live="polite" className="mt-2 font-sans text-xs leading-relaxed text-ink-secondary">
            {month >= PRETRAINING_MONTHS[0] && month <= PRETRAINING_MONTHS[3]
              ? `${frame.label} sits inside the sampled span: gaps between frames are one to six months, so crop condition, water extent, and sun angle all move between observations.`
              : `${frame.label} sits outside the sampled span: the sample never sees this month, which is exactly why a shifted growing season can fool a model that leaned on date priors.`}
          </p>
        </div>
      </div>
    </figure>
  );
}
