import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, LinkedInRateLimitError, LinkedInAuthError, LinkedInServerError, LinkedInClientError } from '@/lib/linkedin/retry';

describe('Retry Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries on rate limit error with exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new LinkedInRateLimitError('Rate limited', 429))
      .mockRejectedValueOnce(new LinkedInRateLimitError('Rate limited', 429))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
    
    // Fast-forward through delays
    await vi.runAllTimersAsync();
    
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries on server error (5xx)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new LinkedInServerError('Internal server error', 500))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 50 });
    await vi.runAllTimersAsync();
    
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on auth error (401)', async () => {
    const fn = vi.fn().mockRejectedValue(new LinkedInAuthError('Unauthorized', 401));

      await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow(LinkedInAuthError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on client error (4xx except 429)', async () => {
    const fn = vi.fn().mockRejectedValue(new LinkedInClientError('Bad request', 400));

      await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow(LinkedInClientError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new LinkedInRateLimitError('Rate limited', 429));

    const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
    // Attach the rejection handler before advancing timers, so Vitest never sees
    // the exhausted retry promise as an unhandled rejection.
    const assertion = expect(promise).rejects.toThrow(LinkedInRateLimitError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry callback', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new LinkedInRateLimitError('Rate limited', 429))
      .mockResolvedValueOnce('success');

    const promise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 10, onRetry });
    await vi.runAllTimersAsync();
    
    await promise;
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(LinkedInRateLimitError));
  });
});