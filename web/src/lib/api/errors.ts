export type ValidationErrors = Record<string, string[]>;

/**
 * An error response from the Laravel API.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: ValidationErrors;
  /** The parsed response body, for endpoints that return data with an error status. */
  readonly body: unknown;

  constructor(status: number, message: string, errors: ValidationErrors = {}, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.body = body;
  }

  /** Laravel validation failure (422) with per-field messages. */
  get isValidation(): boolean {
    return this.status === 422;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** Too many requests. Login lockouts also carry field errors. */
  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** First message for a field, if any. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * A user-facing message for any thrown value.
 */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isApiError(error)) {
    if (error.status >= 500) return fallback;
    return error.message || fallback;
  }
  if (error instanceof TypeError) {
    return "Unable to reach the server. Check your connection and try again.";
  }
  return fallback;
}
