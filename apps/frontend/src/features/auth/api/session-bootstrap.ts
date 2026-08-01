import { authApi } from '@/features/auth/api/auth-api';
import { tokenStorage } from '@/shared/auth/token-storage';
import type { AuthenticatedUser } from '@/shared/auth/types';

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
    } catch {
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
  } catch {
    tokenStorage.clear();
    return null;
  }
}
