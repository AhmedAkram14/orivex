import { authApi } from '@/features/auth/api/auth-api';
import { tokenStorage } from '@/shared/auth/token-storage';
import type { AuthenticatedUser } from '@/shared/auth/types';
import { ApiError } from '@/shared/lib/api/client';

/**
 * True for a failure that says nothing about whether a session exists: a
 * dropped connection or CORS/DNS failure (a plain `TypeError` from `fetch`),
 * a 5xx while the backend is cold-starting or restarting, or a 408/429. Only
 * a definite 4xx from `/auth/*` (no cookie, rotated-away/expired/revoked
 * refresh token) means "no session". Treating a transient failure as "no
 * session" is what flashed the "Sign in required" screen on a hard reload of
 * an authenticated route, because `useSessionQuery` resolves `null` straight
 * to `unauthenticated`.
 */
export function isTransientSessionError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 408 || error.status === 429;
  }
  return true;
}

/**
 * Silent session recovery: on a genuine cold start (no access token in
 * memory yet, e.g. straight after a page load/refresh) this refreshes
 * first -- in a real deployment relying on the browser automatically
 * sending an httpOnly refresh-token cookie, see src/mocks/auth-store.ts's
 * comment for how the mock backend simulates the equivalent -- then
 * fetches the user with the freshly-issued access token.
 *
 * This query also gets re-invalidated any time a real-time notification
 * arrives (`useRealtimeSocket`, so a role change picks up its new claim),
 * which used to unconditionally re-run this same refresh-then-fetch every
 * time -- forcing a refresh-token rotation on every single notification,
 * racing against `useSilentRefresh`'s own independent expiry-timer
 * refresh and occasionally causing one of the two concurrent calls to
 * present an already-rotated-away token and fail, logging the user out
 * for no real reason. When a still-valid access token already exists,
 * there is nothing to recover -- just re-fetch the user with it. The
 * tradeoff: a role-changing notification's new claim is only picked up on
 * the next natural silent-refresh cycle (within a minute of real expiry)
 * instead of instantly, which is a far smaller cost than a spurious
 * logout. Either step failing means "no session to recover" -- the normal
 * logged-out outcome, not an error to surface.
 */
export async function bootstrapSession(): Promise<AuthenticatedUser | null> {
  const hasValidToken = () => {
    const expiresAt = tokenStorage.getExpiresAt();
    return Boolean(tokenStorage.getAccessToken()) && Boolean(expiresAt) && new Date(expiresAt as string).getTime() > Date.now();
  };

  if (!hasValidToken()) {
    try {
      const refreshed = await authApi.refreshSession();
      tokenStorage.setAccessToken(refreshed.accessToken, refreshed.accessTokenExpiresAt);
    } catch (error) {
      // Transient: rethrow so the session query retries (with backoff)
      // instead of resolving `null` and signing the visitor out.
      if (isTransientSessionError(error)) throw error;
      tokenStorage.clear();
      return null;
    }
  }

  try {
    const session = await authApi.getSession();
    if (!session) {
      tokenStorage.clear();
      return null;
    }
    return session.user;
  } catch (error) {
    if (isTransientSessionError(error)) throw error;
    tokenStorage.clear();
    return null;
  }
}
