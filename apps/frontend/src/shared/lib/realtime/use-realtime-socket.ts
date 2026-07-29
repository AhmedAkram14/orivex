'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/shared/auth/auth-context';
import { tokenStorage } from '@/shared/auth/token-storage';
import { env } from '@/shared/lib/env';

/**
 * ORIVEX Roadmap 2.0 Stage 7 (real-time layer): a single socket for every
 * live push this app needs. Every business event a doctor or patient cares
 * about in real time (a new appointment request, an approval, a completed
 * consultation, a verification decision) already creates a real
 * `Notification` row (this session's own notification-handler work) --
 * the backend's `RealtimeNotifyingNotificationRepository` emits
 * `notification.changed` to that notification's own account the instant
 * it's saved. Listening to that one event and invalidating every query
 * that could plausibly be stale is simpler and more robust than inventing
 * a second, narrower event taxonomy that has to be kept in sync with
 * exactly which handler fired: an extra refetch of an already-fresh list
 * costs nothing a user would ever notice, whereas a missed invalidation
 * (because some new handler forgot to emit the "right" narrow event)
 * reintroduces the exact "I only find out if I refresh" bug this exists
 * to fix.
 */
export function useRealtimeSocket(): void {
  const { status } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Never opens a real socket in the test environment (Vitest sets
    // NODE_ENV=test) -- MSW mocks REST via fetch interception, but has no
    // equivalent for a raw WebSocket/polling transport, so an unmocked
    // `io()` call here would either hang the test runner retrying against
    // an unreachable localhost:4000 or trip `onUnhandledRequest: 'error'`
    // if socket.io's own polling fallback happens to hit an HTTP endpoint.
    if (status !== 'authenticated' || process.env.NODE_ENV === 'test') {
      return;
    }

    const token = tokenStorage.getAccessToken();
    if (!token) {
      return;
    }

    const socket: Socket = io(env.apiBaseUrl, {
      auth: { token },
      withCredentials: true,
    });

    socket.on('notification.changed', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-pending-approval'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-upcoming-work'] });
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-upcoming-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-summary'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-reviews'] });
      // Product follow-up (2026-07-29): a role change (e.g. a doctor
      // verification getting approved) also arrives as a Notification.
      // The account's role only actually changes in the access token the
      // NEXT time it's refreshed (RolesGuard trusts the JWT claim, never a
      // live DB read -- see RefreshSessionUseCase, which re-derives role
      // from the account on every refresh) -- so without this, a doctor who
      // gets approved while already logged in keeps hitting "Access
      // restricted" on /doctor/* until they refresh the page or their token
      // happens to expire. Invalidating the session query re-triggers
      // bootstrapSession(), which refreshes the token (picking up the new
      // role claim) and re-fetches the user in one round trip.
      queryClient.invalidateQueries({ queryKey: ['auth-session'] });
    });

    // Product follow-up (2026-07-29): edit/delete on a review recompute the
    // doctor's rating without creating a Notification (that would spam the
    // doctor on every correction) -- so it needs its own direct event,
    // separate from the notification.changed fan-out above.
    socket.on('doctor-reviews.changed', () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-dashboard'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [status, queryClient]);
}
