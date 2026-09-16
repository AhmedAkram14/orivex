'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getOpenThreadId } from '@/features/messaging/hooks/open-thread-tracker';
import { messageThreadsKeys, messagesKeys } from '@/features/messaging/hooks/query-keys';
import { useAuth } from '@/shared/auth/auth-context';
import { tokenStorage } from '@/shared/auth/token-storage';
import { env } from '@/shared/lib/env';
import { toast } from '@/shared/ui/use-toast';

// Messages Page Overhaul (Phase 2): `useRealtimeSocket` is mounted exactly
// once app-wide (AppShell) and owns the one real connection -- everything
// else that needs the live channel (the composer's typing-emit, the
// connection-state indicator) reaches it through this tiny module-level
// singleton instead of calling `io()` a second time. `getRealtimeSocket()`
// is for one-off imperative use (emit a typing event); `useRealtimeConnectionState()`
// is for anything that needs to reactively render connect/disconnect state.
let sharedSocket: Socket | undefined;
let isConnected = false;
const connectionListeners = new Set<(connected: boolean) => void>();

function setConnectionState(connected: boolean): void {
  isConnected = connected;
  connectionListeners.forEach((listener) => listener(connected));
}

export function getRealtimeSocket(): Socket | undefined {
  return sharedSocket;
}

/** Reactive connect/disconnect state -- backs a subtle "Reconnecting…" indicator wherever the live channel matters (e.g. the messaging workspace). */
export function useRealtimeConnectionState(): boolean {
  const [connected, setConnected] = useState(isConnected);

  useEffect(() => {
    connectionListeners.add(setConnected);
    setConnected(isConnected);
    return () => {
      connectionListeners.delete(setConnected);
    };
  }, []);

  return connected;
}

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
  const tToast = useTranslations('messaging.toast');

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
    sharedSocket = socket;
    setConnectionState(socket.connected);

    socket.on('connect', () => setConnectionState(true));
    socket.on('disconnect', () => setConnectionState(false));

    // The access token is only captured once, at connect time (`auth`
    // above) -- socket.io-client's automatic reconnection keeps resending
    // that same snapshot, so after any token rotation (silent refresh,
    // etc.) a reconnect silently fails RealtimeGateway's handshake auth
    // and this client stops receiving `notification.changed` until the
    // component remounts. Mutating `socket.auth` and forcing an immediate
    // reconnect whenever the token actually changes keeps the channel
    // alive across rotations instead of going silently deaf.
    const unsubscribe = tokenStorage.subscribe(() => {
      const nextToken = tokenStorage.getAccessToken();
      if (!nextToken) {
        return;
      }
      socket.auth = { token: nextToken };
      if (socket.connected) {
        socket.disconnect().connect();
      }
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
      // UX Reliability Pass: a verification decision (patient identity or
      // doctor credentialing, approve/reject/suspend) already arrives as a
      // Notification through this same event -- these two query keys were
      // simply missing from this fan-out, so the applicant's own status
      // screen sat on its 30s staleTime instead of updating live.
      queryClient.invalidateQueries({ queryKey: ['patient-identity-verification-status'] });
      queryClient.invalidateQueries({ queryKey: ['patient-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-verifications'] });
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

    // Messages Page Overhaul (Phase 2): `RealtimeNotifyingMessageRepository`
    // emits `message.sent` to the RECIPIENT the instant a message is saved.
    // The inbox list (`messageThreadsKeys.list()`) is always invalidated --
    // it backs the unread badge/ordering regardless of which thread is
    // open. The specific thread's own message list is invalidated by its
    // exact key too; TanStack Query only actually refetches it if that
    // query is currently mounted/observed, so invalidating a thread nobody
    // has open costs nothing -- simpler and just as correct as first
    // checking "is this the open thread" ourselves.
    socket.on('message.sent', (payload: { threadId: string; messageId?: string }) => {
      queryClient.invalidateQueries({ queryKey: messageThreadsKeys.list() });
      if (payload?.threadId) {
        queryClient.invalidateQueries({ queryKey: messagesKeys.detail(payload.threadId) });
      }

      // Background-thread notification: the aria-live announcer (Phase 3)
      // only reaches screen-reader users -- a sighted doctor/patient who's
      // looked away from the tab needs more than a hidden live region.
      // Only toasts when the arriving message is for a thread OTHER than
      // the one currently open (open-thread-tracker.ts) -- no need to tell
      // someone about a message in the conversation they're already
      // looking at, since ThreadPanel's own message list just updated.
      if (payload?.threadId && payload.threadId !== getOpenThreadId()) {
        toast({ title: tToast('newMessageTitle'), description: tToast('newMessageDescription') });
      }
    });

    // `saveAllAndMarkThreadRead()` emits `message.read` to the SENDER of
    // the now-read messages -- lets their own thread panel update its
    // checkmarks live instead of waiting on the ~60s fallback poll.
    socket.on('message.read', (payload: { threadId?: string }) => {
      queryClient.invalidateQueries({ queryKey: messageThreadsKeys.list() });
      if (payload?.threadId) {
        queryClient.invalidateQueries({ queryKey: messagesKeys.detail(payload.threadId) });
      }
    });

    return () => {
      unsubscribe();
      socket.disconnect();
      if (sharedSocket === socket) {
        sharedSocket = undefined;
      }
      setConnectionState(false);
    };
  }, [status, queryClient, tToast]);
}
