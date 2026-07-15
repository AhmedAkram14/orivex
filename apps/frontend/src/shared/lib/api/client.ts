import { env } from '@/shared/lib/env';

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

/**
 * Auth header injection point, replaced by shared/auth's SessionProvider
 * once a real access token exists (in-memory only — see shared/auth/
 * token-storage.ts). A no-op by default so apiFetch itself never needs to
 * change when auth state does.
 */
let getAuthHeader: () => Record<string, string> = () => ({});

/** Called once by shared/auth's AuthProvider when real auth exists — not exported for general use. */
export function __setAuthHeaderProvider(provider: () => Record<string, string>): void {
  getAuthHeader = provider;
}

export async function apiFetch<T>({ method = 'GET', body, path, signal }: ApiRequestOptions): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Required for the httpOnly refresh-token cookie (AuthenticationModule,
    // apps/backend/src/modules/authentication) to be sent/received: the
    // frontend (orivex-eg.vercel.app) and backend (orivex-backend.onrender.com)
    // are different eTLD+1 domains, so this is a genuinely cross-site request
    // — browsers never attach cookies to one without explicit opt-in, even
    // same-origin defaults aren't enough. Backend CORS already pairs this
    // with `credentials: true`.
    credentials: 'include',
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
