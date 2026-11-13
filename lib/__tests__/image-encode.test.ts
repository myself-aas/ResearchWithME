import { describe, expect, it } from 'vitest';
import { encodeWithinBudget, type Encoder } from '@/lib/images/encode';

const KB = 1024;
const blob = (n: number, type: string) => new Blob([new Uint8Array(n)], { type });

function fake(script: Array<Blob | null>) {
  const calls: Array<[string, number]> = [];
  let i = 0;
  const encoder: Encoder = async (type, quality) => {
    calls.push([type, quality]);
    return script[Math.min(i++, script.length - 1)];
  };
  return { encoder, calls };
}

describe('encodeWithinBudget', () => {
  it('returns WebP at the starting quality when it fits', async () => {
    const { encoder, calls } = fake([blob(100 * KB, 'image/webp')]);
    const r = await encodeWithinBudget(encoder, 'banner');
    expect(r.type).toBe('image/webp');
    expect(r.quality).toBe(82);
    expect(calls).toHaveLength(1);
  });

  it('steps quality down by 5 until it fits', async () => {
    const { encoder, calls } = fake([
      blob(400 * KB, 'image/webp'),
      blob(350 * KB, 'image/webp'),
      blob(280 * KB, 'image/webp'),
    ]);
    const r = await encodeWithinBudget(encoder, 'banner');
    expect(r.quality).toBe(72);
    expect(calls.map((c) => c[1])).toEqual([0.82, 0.77, 0.72]);
  });

  it('falls back to JPEG when WebP encoding is unsupported', async () => {
    const { encoder, calls } = fake([blob(10 * KB, 'image/png'), blob(10 * KB, 'image/jpeg')]);
    const r = await encodeWithinBudget(encoder, 'banner');
    expect(calls[1][0]).toBe('image/jpeg');
    expect(r.type).toBe('image/jpeg');
  });

  it('treats a null first result as WebP unsupported', async () => {
    const { encoder, calls } = fake([null, blob(10 * KB, 'image/jpeg')]);
    const r = await encodeWithinBudget(encoder, 'avatar');
    expect(calls[1][0]).toBe('image/jpeg');
    expect(r.type).toBe('image/jpeg');
  });

  it('throws on a null JPEG result', async () => {
    const { encoder } = fake([blob(1, 'image/png'), null]);
    await expect(encodeWithinBudget(encoder, 'avatar')).rejects.toThrow(
      'The image could not be encoded.',
    );
  });

  it('throws when even the floor quality is too big', async () => {
    const { encoder } = fake([blob(400 * KB, 'image/webp')]);
    await expect(encodeWithinBudget(encoder, 'banner')).rejects.toThrow(
      'The image could not be compressed under 300 KB. Crop tighter or choose a smaller photo.',
    );
  });
});
