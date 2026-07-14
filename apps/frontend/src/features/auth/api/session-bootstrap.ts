import { authApi } from '@/features/auth/api/auth-api';
import { tokenStorage } from '@/shared/auth/token-storage';
import type { AuthenticatedUser } from '@/shared/auth/types';

/**
 * Silent session recovery on app load: refresh first (in a real
 * deployment this relies on the browser automatically sending an httpOnly
 * refresh-token cookie — see src/mocks/auth-store.ts's comment for how
 * the mock backend simulates the equivalent), then fetch the user with
 * the freshly-issued access token. Either step failing means "no session
 * to recover" — the normal logged-out outcome, not an error to surface.
 */
export async function bootstrapSession(): Promise<AuthenticatedUser | null> {
  try {
    const refreshed = await authApi.refreshSession();
    tokenStorage.setAccessToken(refreshed.accessToken, refreshed.accessTokenExpiresAt);
  } catch {
    tokenStorage.clear();
    return null;
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
