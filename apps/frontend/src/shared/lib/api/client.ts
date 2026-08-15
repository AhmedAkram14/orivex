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

const AUTH_PATH_PREFIX = '/auth/';

/**
 * `/auth/*` resolves to a same-origin relative URL in a real browser, so
 * Next.js's own rewrite proxy (next.config.ts) forwards it to the backend
 * server-side — see that file's comment for why: it's the one prefix that
 * sets/reads the httpOnly refresh-token cookie, and WebKit (Safari/iOS)
 * blocks that cookie outright when it's genuinely cross-site. Every other
 * path still calls the backend directly; they authenticate via the
 * in-memory bearer token, not a cookie, so they were never affected.
 *
 * In tests there's no real Next.js server applying that rewrite — MSW's
 * handlers (src/mocks/handlers/auth.ts) are registered against the
 * absolute `env.apiBaseUrl`, so this keeps hitting that directly there,
 * unchanged from before.
 */
function resolveUrl(path: string): string {
  if (process.env.NODE_ENV === 'test' || !path.startsWith(AUTH_PATH_PREFIX)) {
    return `${env.apiBaseUrl}${path}`;
  }
  return path;
}

async function performRequest({ method = 'GET', body, path, signal }: ApiRequestOptions): Promise<unknown> {
  const response = await fetch(resolveUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: body === undefined ? undefined : JSON.stringify(body),
    // Required for the httpOnly refresh-token cookie (AuthenticationModule,
    // apps/backend/src/modules/authentication) to be sent/received on the
    // non-/auth/* paths (still genuinely cross-site) and harmless to keep
    // on the proxied /auth/* paths (same-origin, where it's just the
    // default anyway). Backend CORS already pairs this with
    // `credentials: true`.
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

  return json;
}

export async function apiFetch<T>(options: ApiRequestOptions): Promise<T> {
  const json = await performRequest(options);

  // Envelope-wrapped ({ data, meta }) if a top-level "data" property is
  // present; otherwise the parsed JSON is the payload itself (e.g.
  // HealthController's plain, unwrapped responses).
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/**
 * Optional, additive pagination metadata a list endpoint's envelope may
 * carry alongside `{ requestId, timestamp }` -- mirrors the backend's own
 * `PaginationMeta` (shared/http/response-envelope.ts). Only populated when
 * the endpoint was called with page/limit query params.
 */
export interface ApiResponseMetaWithPagination extends ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
}

/**
 * Same request/error handling as `apiFetch`, but for the rarer case where a
 * caller needs the envelope's `meta` too (e.g. `total` for real pagination
 * controls) instead of just the unwrapped `data`. Most list endpoints bundle
 * their own pagination fields directly into `data` (see admin's
 * `ListAdminPaymentTransactionsResult`) and never need this -- this exists
 * for the endpoints (e.g. NotificationController) that instead put
 * page/limit/total on the envelope's `meta`, which plain `apiFetch` discards.
 */
export async function apiFetchWithMeta<T>(
  options: ApiRequestOptions,
): Promise<{ data: T; meta: ApiResponseMetaWithPagination }> {
  const json = await performRequest(options);

  if (json !== null && typeof json === 'object' && 'data' in json) {
    const envelope = json as { data: T; meta?: ApiResponseMetaWithPagination };
    return {
      data: envelope.data,
      meta: envelope.meta ?? { requestId: 'unknown', timestamp: new Date().toISOString() },
    };
  }
  return { data: json as T, meta: { requestId: 'unknown', timestamp: new Date().toISOString() } };
}
