import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ThreadPanel } from '@/features/messaging/components/thread-panel';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetMessagingStore, startOrGetThread } from '@/mocks/messaging-store';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import enMessages from '../../../../messages/en.json';

// Typing indicator (Messages Page Overhaul, Phase 2): ThreadPanel listens
// on the ONE shared socket via `getRealtimeSocket()` rather than opening
// its own connection -- this fake stands in for that shared socket exactly
// the way use-realtime-socket.test.tsx's fake does for the hook that owns
// it, letting the test fire a `messaging.typing` event directly.
const registeredHandlers = new Map<string, (payload?: unknown) => void>();
const fakeSocket = {
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => registeredHandlers.set(event, handler)),
  off: vi.fn(),
};

vi.mock('@/shared/lib/realtime/use-realtime-socket', () => ({
  getRealtimeSocket: () => fakeSocket,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMessagingStore();
  registeredHandlers.clear();
});
afterAll(() => server.close());

const doctorState: AuthState = {
  status: 'authenticated',
  user: { id: LEGACY_DOCTOR_ACCOUNT_ID, email: 'doctor@orivex.dev', fullName: 'Dr. Sarah Ahmed', roles: ['doctor'] },
};

function renderThreadPanel(threadId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={doctorState}>
          <ThreadPanel threadId={threadId} counterpartyName="Ahmed Ali" counterpartyAccountId={LEGACY_PATIENT_ACCOUNT_ID} />
        </AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('ThreadPanel typing indicator', () => {
  it('shows "Typing…" only for a messaging.typing event scoped to this thread, and clears after silence', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const thread = startOrGetThread(LEGACY_PATIENT_ACCOUNT_ID, LEGACY_DOCTOR_ACCOUNT_ID);
    renderThreadPanel(thread.id);

    await waitFor(() => expect(registeredHandlers.has('messaging.typing')).toBe(true));
    expect(screen.queryByText('Typing…')).not.toBeInTheDocument();

    // An event for a DIFFERENT thread must never show here.
    act(() => registeredHandlers.get('messaging.typing')?.({ threadId: 'some-other-thread', fromAccountId: LEGACY_PATIENT_ACCOUNT_ID }));
    expect(screen.queryByText('Typing…')).not.toBeInTheDocument();

    act(() => registeredHandlers.get('messaging.typing')?.({ threadId: thread.id, fromAccountId: LEGACY_PATIENT_ACCOUNT_ID }));
    expect(screen.getByText('Typing…')).toBeInTheDocument();

    // Clears itself after ~5s of silence.
    act(() => {
      vi.advanceTimersByTime(5001);
    });
    expect(screen.queryByText('Typing…')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
