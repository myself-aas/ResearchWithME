import { describe, expect, it } from 'vitest';
import {
  CHECKPOINTS,
  PRETRAINING_MONTHS,
  buildMask,
  findCheckpoint,
  mulberry32,
  seasonFrame,
  tokenSequenceLength,
} from '@/lib/post/prithvi';

describe('checkpoint facts', () => {
  it('lists the six released checkpoints across four sizes', () => {
    expect(CHECKPOINTS).toHaveLength(6);
    expect(new Set(CHECKPOINTS.map((checkpoint) => checkpoint.params))).toEqual(new Set([5, 100, 300, 600]));
    // The public plain/TL pairs exist only at 300M and 600M.
    const pairs = CHECKPOINTS.filter((checkpoint) => checkpoint.params >= 300);
    expect(pairs.filter((checkpoint) => !checkpoint.tl)).toHaveLength(2);
    expect(pairs.filter((checkpoint) => checkpoint.tl)).toHaveLength(2);
    // Small variants are TL-only.
    expect(CHECKPOINTS.filter((checkpoint) => checkpoint.params < 300).every((c) => c.tl)).toBe(true);
  });

  it('carries the pretraining cost the paper reports for 300M and 600M', () => {
    expect(findCheckpoint('300m')?.gpuHours).toBe(21000);
    expect(findCheckpoint('300m')?.gpus).toBe(80);
    expect(findCheckpoint('600m-tl')?.gpuHours).toBe(58000);
    expect(findCheckpoint('600m-tl')?.gpus).toBe(240);
    expect(findCheckpoint('tiny-tl')?.gpuHours).toBeUndefined();
  });

  it('links every checkpoint to a Hugging Face card', () => {
    for (const checkpoint of CHECKPOINTS) {
      expect(checkpoint.href).toMatch(/^https:\/\/huggingface\.co\//);
    }
  });
});

describe('buildMask', () => {
  it('hides exactly round(ratio × total) patches', () => {
    const total = 6 * 10;
    expect(buildMask(7, 0.75, 6, 10).maskedCount).toBe(Math.round(0.75 * total));
    expect(buildMask(7, 0.5, 6, 10).maskedCount).toBe(total / 2);
    expect(buildMask(7, 0, 6, 10).maskedCount).toBe(0);
    // A full mask would leave no conditioning signal; the helper clamps to 0.95.
    expect(buildMask(7, 1, 6, 10).maskedCount).toBe(Math.round(0.95 * total));
  });

  it('is deterministic: same seed and ratio, same mask', () => {
    expect(buildMask(7, 0.75, 6, 10)).toEqual(buildMask(7, 0.75, 6, 10));
    expect(buildMask(7, 0.75, 6, 10).masked).not.toEqual(buildMask(8, 0.75, 6, 10).masked);
  });

  it('counts visible tokens as the complement', () => {
    const mask = buildMask(3, 0.6, 6, 10);
    expect(mask.visibleCount).toBe(6 * 10 - mask.maskedCount);
  });
});

describe('mulberry32', () => {
  it('produces a reproducible sequence in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('seasonFrame', () => {
  it('labels every month and stays inside the year', () => {
    for (let month = 0; month < 12; month += 1) {
      const frame = seasonFrame(month);
      expect(frame.month).toBe(month);
      expect(frame.ndvi).toBeGreaterThan(0);
      expect(frame.ndvi).toBeLessThanOrEqual(1);
      expect(frame.land).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('clamps out-of-range months', () => {
    expect(seasonFrame(-4).month).toBe(0);
    expect(seasonFrame(19).month).toBe(11);
  });

  it('peaks in midsummer and bottoms out in winter', () => {
    const july = seasonFrame(6);
    const january = seasonFrame(0);
    expect(july.ndvi).toBeGreaterThan(0.7);
    expect(january.ndvi).toBeLessThan(0.3);
  });

  it('is deterministic', () => {
    expect(seasonFrame(5)).toEqual(seasonFrame(5));
  });
});

describe('tokenSequenceLength', () => {
  it('uses a temporal patch size of one: frames × patches', () => {
    expect(tokenSequenceLength(4, 6, 10)).toBe(240);
    expect(tokenSequenceLength(1, 6, 10)).toBe(60);
  });
});

describe('pretraining months', () => {
  it('marks four frames, one to six months apart', () => {
    expect(PRETRAINING_MONTHS).toHaveLength(4);
    const gaps = PRETRAINING_MONTHS.slice(1).map((month, index) => month - PRETRAINING_MONTHS[index]);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(1);
      expect(gap).toBeLessThanOrEqual(6);
    }
  });
});
