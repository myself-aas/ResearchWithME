import type { FieldErrors } from './types';

/** Base class for errors that can be mapped directly onto an HTTP response. */
export class CmsError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 500, code = 'cms_error') {
    super(message);
    this.name = 'CmsError';
    this.status = status;
    this.code = code;
  }
}

export class CmsValidationError extends CmsError {
  readonly fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors = {}) {
    super(message, 400, 'validation_failed');
    this.name = 'CmsValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class CmsConflictError extends CmsError {
  constructor(message = 'A post with this URL already exists. Choose a different title or slug.') {
    super(message, 409, 'conflict');
    this.name = 'CmsConflictError';
  }
}

export class CmsNotFoundError extends CmsError {
  constructor(message = 'That record no longer exists.') {
    super(message, 404, 'not_found');
    this.name = 'CmsNotFoundError';
  }
}

export class CmsUnavailableError extends CmsError {
  constructor(message = 'The content service is unavailable. Try again in a moment.') {
    super(message, 503, 'unavailable');
    this.name = 'CmsUnavailableError';
  }
}

export function toCmsError(error: unknown): CmsError {
  if (error instanceof CmsError) return error;
  if (error instanceof Error) return new CmsError(error.message);
  return new CmsError('Something went wrong while saving.');
}
