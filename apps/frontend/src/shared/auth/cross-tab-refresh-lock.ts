/**
 * Cross-tab Refresh Lock (Phase 9 [VERIFY] — session refresh race).
 *
 * Root cause: `apps/backend/src/modules/authentication/application/
 * use-cases/refresh-session/refresh-session.use-case.ts` rotates the
 * refresh token in place on every use (`Session.rotate`,
 * `prisma-session.repository.ts`'s `refreshTokenHash` is a unique column)
 * and, separately, revokes every session for the credential if a token
 * that's already been marked revoked is presented again (reuse
 * detection). A single login is one `Session` row shared by every tab —
 * the refresh-token credential itself lives in one httpOnly cookie the
 * browser sends automatically to any tab of this origin
 * (`shared/auth/token-storage.ts`'s docblock), never in per-tab JS state.
 *
 * `features/auth/api/auth-api.ts`'s `inFlightRefresh` already coalesces
 * concurrent `refreshSession()` calls -- but only within one tab's own JS
 * module instance. Two tabs whose independent `useSilentRefresh` timers
 * (or a bootstrap/notification-triggered recovery) fire close together
 * each start their own network request reading the SAME current cookie
 * value at send time. Without any ordering guarantee, both requests can
 * reach the backend before either commits its rewrite, so the row's
 * `refreshTokenHash` column ends up holding whichever request's write
 * happened to land last in the database -- independently of which
 * response's `Set-Cookie` the browser happens to keep. Whichever tab's
 * belief doesn't match what's actually stored fails its *next* refresh
 * with "not found" (not reuse-detected, since the two hashes were never
 * marked revoked, just overwritten) and that tab alone drops to
 * unauthenticated, reading to the user as an abrupt, unexplained sign-out
 * even though the underlying session was never actually invalid.
 *
 * This is frontend-only and does not change what token the backend
 * accepts or how it validates one -- it only prevents two tabs from ever
 * having two /auth/refresh requests in flight at the same time, so every
 * refresh call always observes (and rewrites) the cookie's true current
 * value, never a value another tab is mid-flight on rewriting.
 */
const LOCK_NAME = 'orivex:auth-refresh';

export function withCrossTabRefreshLock<T>(run: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !('locks' in navigator) || !navigator.locks) {
    // Web Locks API unsupported (e.g. Safari < 15.4) -- run directly.
    // authApi.refreshSession's own same-tab in-flight coalescing still
    // applies; only the cross-tab race described above can still occur,
    // and only in a browser old enough to lack this API.
    return run();
  }
  return navigator.locks.request(LOCK_NAME, run) as Promise<T>;
}
