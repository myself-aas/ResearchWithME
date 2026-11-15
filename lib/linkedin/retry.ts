export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

export class LinkedInError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly details?: unknown) {
    super(message);
    this.name = 'LinkedInError';
  }
}

export class LinkedInRateLimitError extends LinkedInError {
  constructor(message: string, statusCode: number = 429, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'LinkedInRateLimitError';
  }
}

export class LinkedInAuthError extends LinkedInError {
  constructor(message: string, statusCode: number = 401, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'LinkedInAuthError';
  }
}

export class LinkedInServerError extends LinkedInError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'LinkedInServerError';
  }
}

export class LinkedInClientError extends LinkedInError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'LinkedInClientError';
  }
}

const DEFAULT_RETRYABLE_CODES = [429, 500, 502, 503, 504];

export function isRetryableError(error: Error, retryableCodes: number[]): boolean {
  if (error instanceof LinkedInRateLimitError) return true;
  if (error instanceof LinkedInAuthError) return false;
  if (error instanceof LinkedInClientError) return false;
  if (error instanceof LinkedInServerError) return retryableCodes.includes(error.statusCode);
  return false; // Unknown errors - don't retry by default
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryableStatusCodes = DEFAULT_RETRYABLE_CODES,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = baseDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) break;
      
      if (!isRetryableError(lastError, retryableStatusCodes)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait with jitter
      const jitter = Math.random() * 0.3 * delay;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError!;
}