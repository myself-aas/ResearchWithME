'use client';

import { useEffect, useRef, useState } from 'react';
import FigureChrome, { PRIMARY_BUTTON, READOUT_CLASS, SECONDARY_BUTTON } from './FigureChrome';
import { clampTick, leaderIndex, ranks, tickCount, valueAt, type RaceSeries } from '@/lib/figures/race';
import { TONE_FILL } from '@/lib/figures/tones';

/**
 * RacePlayback — archetype `playback-race-series`.
 *
 * The only transport-controlled figure in the library: press play and several
 * ordered series replay tick by tick, ranks swapping as they go. Where the
 * season scrubber drags one field by hand, this figure runs on its own clock —
 * play/pause, step, restart, and a 1×/2× speed toggle. Honours
 * `prefers-reduced-motion` by jumping to the final tick instead of animating.
 */
export default function RacePlayback({
  series,
  unit,
  initialTick = 0,
}: {
  series: RaceSeries[];
  unit?: string;
  initialTick?: number;
}) {
  const total = tickCount(series);
  const [tick, setTick] = useState(clampTick(initialTick, total));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => clearTimer, []);

  function play() {
    clearTimer();
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTick(total - 1);
      return;
    }
    setPlaying(true);
    timer.current = setInterval(() => {
      setTick((current) => {
        if (current >= total - 1) {
          clearTimer();
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 620 / speed);
  }

  function pause() {
    clearTimer();
    setPlaying(false);
  }

  const values = series.map((line) => valueAt(line, tick));
  const order = ranks(values);
  const leader = leaderIndex(values);
  const maxValue = Math.max(
    ...series.flatMap((line) => line.points),
    1,
  );

  return (
    <FigureChrome
      title="Replay the race, tick by tick"
      subtitle="A transport, not a scrubber: play, pause, step, or restart the replay and watch ranks swap as the series advance."
    >
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => (playing ? pause() : play())} className={PRIMARY_BUTTON}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => { pause(); setTick((current) => clampTick(current - 1, total)); }} className={SECONDARY_BUTTON}>
          ◀ Step
        </button>
        <button type="button" onClick={() => { pause(); setTick((current) => clampTick(current + 1, total)); }} className={SECONDARY_BUTTON}>
          Step ▶
        </button>
        <button type="button" onClick={() => { pause(); setTick(0); }} className={SECONDARY_BUTTON}>
          Restart
        </button>
        <button
          type="button"
          onClick={() => setSpeed((current) => (current === 1 ? 2 : 1))}
          className={SECONDARY_BUTTON}
          aria-pressed={speed === 2}
        >
          {speed}× speed
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {series.map((line, index) => (
          <div key={line.label} className="flex items-center gap-3">
            <span
              className={`inline-flex h-6 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[0.6875rem] font-semibold ${
                index === leader ? 'bg-brand text-on-primary' : 'border border-line bg-canvas text-ink-secondary'
              }`}
              aria-label={`Rank ${order[index] + 1}`}
            >
              {order[index] + 1}
            </span>
            <span className="w-24 shrink-0 truncate font-sans text-xs font-medium text-ink">{line.label}</span>
            <span className="relative h-5 flex-1 overflow-hidden rounded-full bg-surface-subtle">
              <span
                className={`block h-full rounded-full ${TONE_FILL[line.tone]} transition-[width] duration-300 ease-standard motion-reduce:transition-none`}
                style={{ width: `${(values[index] / maxValue) * 100}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-xs text-ink">{values[index]}</span>
          </div>
        ))}
      </div>

      <p aria-live="polite" className={`${READOUT_CLASS} mt-5`}>
        Tick {tick + 1} of {total} — {series[leader]?.label} leads at {values[leader]}
        {unit ? ` ${unit}` : ''}.
      </p>
    </FigureChrome>
  );
}
