'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { HLS_BANDS, buildMask, tokenSequenceLength } from '@/lib/post/prithvi';

const ROWS = 6;
const COLS = 10;
const FRAMES = 4;

/**
 * Masked-patch reconstruction explorer for the MAE pretraining objective.
 *
 * Drag the ratio slider to hide a share of patches exactly the way the
 * paper's pretraining does (its ratio is 0.75), then reconstruct: the encoder
 * keeps the visible tokens only, the decoder predicts the hidden ones, and
 * the reveal animates them back in. The readout carries the real sequence
 * math — four 256×256 frames at 16×16 patches cut with a temporal patch size
 * of one — so the number in the essay is something the reader has watched
 * happen rather than only read.
 *
 * Used on the article (MDX map) and inside the assistant thread as the
 * `show_masked_patch_reconstructor` generative-UI tool renderer; the mask is
 * deterministic (`lib/post/prithvi.ts`), so the figure is reproducible.
 */
export default function MaskedPatchReconstructor({ initialRatio = 0.75 }: { initialRatio?: number }) {
  const [ratio, setRatio] = useState(Math.min(Math.max(initialRatio, 0), 0.95));
  const [revealed, setRevealed] = useState(false);
  const [revealedOrder, setRevealedOrder] = useState(0);
  const [seed, setSeed] = useState(7);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Cancel a running reveal when the figure unmounts mid-animation.
  useEffect(() => clearTimers, []);

  const mask = buildMask(seed, ratio, ROWS, COLS);
  const sequenceLength = tokenSequenceLength(FRAMES, ROWS, COLS);
  const maskedIndices = mask.masked.reduce<number[]>((acc, isMasked, index) => {
    if (isMasked) acc.push(index);
    return acc;
  }, []);
  const reconstructionDone = revealed && revealedOrder >= mask.maskedCount;
  const reconstructedCount = revealed ? Math.min(revealedOrder, mask.maskedCount) : 0;

  function reconstruct() {
    clearTimers();
    setRevealedOrder(0);
    setRevealed(true);
    // Reveal masked patches one at a time, in mask order; the last one
    // resolves to the full count so the completion state is reachable.
    maskedIndices.forEach((_index, order) => {
      timers.current.push(
        setTimeout(() => setRevealedOrder(order + 1), 40 * (order + 1)),
      );
    });
  }

  function reset() {
    clearTimers();
    setRevealed(false);
    setRevealedOrder(0);
    setSeed((value) => value + 1);
  }

  function onRatioChange(value: number) {
    clearTimers();
    setRatio(value / 100);
    setRevealed(false);
    setRevealedOrder(0);
  }

  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <figcaption className="font-sans text-sm font-semibold text-ink">
          Masked autoencoding, on a grid you control
        </figcaption>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
          Hide patches like the paper&apos;s pretraining objective does, then watch the decoder
          reconstruct them from the visible tokens alone. The token count below is the real one
          for four 256×256 frames cut at 16×16 with a temporal patch size of one.
        </p>
      </div>

      <div className="px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5 font-sans text-xs font-medium text-ink-secondary">
            Masking ratio — {(ratio * 100).toFixed(0)}% of patches hidden
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={Math.round(ratio * 100)}
              onChange={(event) => onRatioChange(Number(event.target.value))}
              className="h-2 w-full accent-[var(--color-brand)]"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reconstruct}
              disabled={ratio === 0 || reconstructionDone}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 py-2.5 font-sans text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Reconstruct
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label="Re-mask with a new pattern"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-2.5 font-sans text-sm text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Re-mask
            </button>
          </div>
        </div>

        <div
          className="mt-6 grid grid-cols-10 gap-1.5"
          role="img"
          aria-label={`Patch grid with ${mask.maskedCount} of ${ROWS * COLS} patches masked`}
        >
          {mask.masked.map((isMasked, index) => {
            const reconstructed = isMasked && revealed;
            const shade = (index * 37) % 5;
            const tone = !isMasked
              ? ['bg-brand/85', 'bg-brand/60', 'bg-trust-emerging/70', 'bg-brand/70', 'bg-knowledge-insight/60'][shade]
              : reconstructed
                ? 'bg-brand/25'
                : 'bg-surface-subtle';
            return (
              <span
                key={index}
                className={`block h-4 w-full rounded-[4px] border ${tone} ${
                  isMasked && !reconstructed ? 'border-dashed border-border-strong/60' : 'border-transparent'
                } transition-colors duration-300`}
              />
            );
          })}
        </div>

        <p aria-live="polite" className="mt-5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-ink-secondary">
          <span>
            Visible tokens: <strong className="text-ink">{mask.visibleCount}</strong>
          </span>
          <span>
            {reconstructionDone
              ? `Reconstructed: ${reconstructedCount} predicted`
              : revealed
                ? `Reconstructing… ${reconstructedCount}/${mask.maskedCount}`
                : `Masked out: ${mask.maskedCount}`}
          </span>
          <span>
            Sequence: {FRAMES} frames × {ROWS * COLS} = <strong className="text-ink">{sequenceLength}</strong> image tokens
          </span>
        </p>
        <p className="mt-2 font-mono text-[0.6875rem] text-ink-secondary">
          The encoder sees only the visible tokens; the decoder predicts {mask.maskedCount} patches it never received.
        </p>
        <p className="mt-2 font-mono text-[0.6875rem] text-ink-secondary">
          Bands per patch: {HLS_BANDS.join(', ')}.
        </p>
      </div>
    </figure>
  );
}
