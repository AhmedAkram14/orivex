import { env } from './env';

// Mirrors the backend's own response shapes exactly (apps/backend/src/
// shared/http/response-envelope.ts and platform/filters/all-exceptions.
// filter.ts) -- not a generic guess. Every error response is
// { error: { code, message, details?, requestId, timestamp } }, per
// docs/12-openapi.md's ErrorResponse schema. Most 2xx responses are
// { data, meta } via the shared envelope() helper, but not all --
// HealthController's /health/liveness and /health/readiness return their
// body plain, with no envelope. apiFetch() supports both (see the
// unwrapping logic below) rather than assuming every controller wraps.
export interface ApiResponseMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId: string;
  timestamp: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetail[];

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  // Backend routes have no global prefix (verified against apps/backend/
  // src/main.ts) -- path is exactly the controller route, e.g. '/doctors/123'.
  path: string;
  signal?: AbortSignal;
}

// No auth header wiring yet -- the backend itself has no authentication
// layer (a documented, deferred future sprint; every current endpoint is
// unauthenticated). Add an Authorization header here the moment the
// backend actually enforces one -- not before, since that would fabricate
// a security posture that doesn't exist server-side yet.
export async function apiFetch<T>({ method = 'GET', body, path, signal }: ApiRequestOptions): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const json: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const errorPayload = (json as { error?: ApiErrorPayload } | undefined)?.error;
    if (errorPayload) {
      throw new ApiError(response.status, errorPayload);
    }
    throw new ApiError(response.status, {
      code: 'UNKNOWN_ERROR',
      message: `Request to ${path} failed with status ${response.status}.`,
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  // Envelope-wrapped ({ data, meta }) if a top-level "data" property is
  // present; otherwise the parsed JSON is the payload itself (e.g.
  // HealthController's plain, unwrapped responses).
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}
