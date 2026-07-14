'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { useSessionQuery } from '@/features/auth/hooks/use-session-query';
import { useSilentRefresh } from '@/features/auth/hooks/use-silent-refresh';
import { AuthContext } from '@/shared/auth/auth-context';
import { tokenStorage } from '@/shared/auth/token-storage';
import type { AuthState } from '@/shared/auth/types';
import { __setAuthHeaderProvider } from '@/shared/lib/api/client';

/**
 * The real implementation behind `shared/auth/auth-context.tsx`'s
 * `AuthContext` — session persistence (via `useSessionQuery`'s silent
 * recovery on mount), Silent Refresh Architecture (`useSilentRefresh`),
 * and wiring the API client's auth-header injection point to the same
 * in-memory token storage. Built entirely against `authApi`, which is
 * itself backed by MSW mocks today (Phase 4, 🔒 blocked on real Keycloak)
 * — every session this provider produces is a real, working session
 * against the mock, not a fabricated one.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const sessionQuery = useSessionQuery();

  useEffect(() => {
    __setAuthHeaderProvider((): Record<string, string> => {
      const token = tokenStorage.getAccessToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    });
  }, []);

  const status: AuthState['status'] = sessionQuery.isPending
    ? 'loading'
    : sessionQuery.data
      ? 'authenticated'
      : 'unauthenticated';

  useSilentRefresh(status === 'authenticated');

  const value = useMemo<AuthState>(
    () => ({ status, user: sessionQuery.data ?? null }),
    [status, sessionQuery.data],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
