'use client';

import type { FieldErrors } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, status: number, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

/**
 * JSON fetch for the studio. A 401 sends the editor to the sign-in page with a
 * return path instead of leaving a dead form on screen.
 */
export async function cmsFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');

  const response = await fetch(input, { ...init, headers });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.status === 401) {
    redirectToLogin();
    throw new ApiError('Sign in to continue.', 401);
  }

  if (!response.ok) {
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const message = typeof record.error === 'string' ? record.error : 'The request could not be completed.';
    const fieldErrors =
      record.fieldErrors && typeof record.fieldErrors === 'object'
        ? (record.fieldErrors as FieldErrors)
        : undefined;
    throw new ApiError(message, response.status, fieldErrors);
  }

  return payload as T;
}

export function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}
