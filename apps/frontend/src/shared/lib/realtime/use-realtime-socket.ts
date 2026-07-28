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
    });

    return () => {
      socket.disconnect();
    };
  }, [status, queryClient]);
}
