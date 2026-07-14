'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authApi } from '@/features/auth/api/auth-api';
import { sessionKeys } from '@/features/auth/hooks/query-keys';
import { tokenStorage } from '@/shared/auth/token-storage';

const REFRESH_MARGIN_MS = 60_000;

/**
 * Silent Refresh Architecture: while authenticated, schedules a background
 * token refresh shortly before the current access token expires, so a
 * session never visibly interrupts the user mid-task. A failed refresh
 * (the assumed refresh credential itself has expired or was revoked) ends
 * the session — Expired Session Handling — rather than retrying silently
 * forever.
 */
export function useSilentRefresh(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function scheduleNext() {
      const expiresAt = tokenStorage.getExpiresAt();
      if (!expiresAt) return;

      const delay = Math.max(new Date(expiresAt).getTime() - Date.now() - REFRESH_MARGIN_MS, 0);
      timeoutId = setTimeout(async () => {
        if (cancelled) return;
        try {
          const refreshed = await authApi.refreshSession();
          tokenStorage.setAccessToken(refreshed.accessToken, refreshed.accessTokenExpiresAt);
          scheduleNext();
        } catch {
          tokenStorage.clear();
          queryClient.setQueryData(sessionKeys.detail('current'), null);
        }
      }, delay);
    }

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [enabled, queryClient]);
}
