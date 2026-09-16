import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { messageThreadsKeys, messagesKeys } from '@/features/messaging/hooks/query-keys';
import { setOpenThreadId } from '@/features/messaging/hooks/open-thread-tracker';
import { AuthContext } from '@/shared/auth/auth-context';
import type { AuthState } from '@/shared/auth/types';
import { tokenStorage } from '@/shared/auth/token-storage';
import { toast } from '@/shared/ui/use-toast';
import enMessages from '../../../../messages/en.json';

import { useRealtimeConnectionState, useRealtimeSocket } from './use-realtime-socket';

// Messages Page Overhaul (Phase 2): no MSW-equivalent exists for a raw
// socket.io connection, so this mocks the socket.io-client module itself --
// a fake socket that records every `.on()` handler by event name and lets
// the test fire them directly, mirroring how MSW lets a test "receive" a
// mocked HTTP response.
const registeredHandlers = new Map<string, (payload?: unknown) => void>();
const fakeSocket = {
  connected: false,
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
    registeredHandlers.set(event, handler);
  }),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(function (this: unknown) {
    return this;
  }),
  connect: vi.fn(function (this: unknown) {
    return this;
  }),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => fakeSocket),
}));

vi.mock('@/shared/ui/use-toast', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui/use-toast')>('@/shared/ui/use-toast');
  return { ...actual, toast: vi.fn(actual.toast) };
});

function fire(event: string, payload?: unknown): void {
  registeredHandlers.get(event)?.(payload);
}

const authenticatedState: AuthState = {
  status: 'authenticated',
  user: { id: 'account-1', email: 'doctor@orivex.dev', fullName: 'Dr. Test', roles: ['doctor'] },
};

function Wrapper({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        <AuthContext.Provider value={authenticatedState}>{children}</AuthContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('useRealtimeSocket (Messages Page Overhaul, Phase 2)', () => {
  beforeEach(() => {
    // The hook's own test-environment guard (`process.env.NODE_ENV ===
    // 'test'`) exists to stop an unmocked `io()` call from hanging the real
    // test runner -- since socket.io-client is mocked above, it's safe (and
    // necessary) to lift that guard just for this suite so the hook's real
    // connection-setup code actually runs against the fake socket.
    vi.stubEnv('NODE_ENV', 'development');
    tokenStorage.setAccessToken('fake-token', new Date(Date.now() + 60_000).toISOString());
    registeredHandlers.clear();
    fakeSocket.connected = false;
    setOpenThreadId(undefined);
    vi.mocked(toast).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    tokenStorage.clear();
    setOpenThreadId(undefined);
  });

  function renderSocketHook(queryClient: QueryClient) {
    return renderHook(() => useRealtimeSocket(), { wrapper: ({ children }) => <Wrapper queryClient={queryClient}>{children}</Wrapper> });
  }

  it('invalidates the thread list and the specific thread on message.sent, and toasts for a thread that is not open', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderSocketHook(queryClient);

    await waitFor(() => expect(registeredHandlers.has('message.sent')).toBe(true));

    fire('message.sent', { threadId: 'thread-1', messageId: 'message-1' });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    expect(invalidatedKeys).toContainEqual(messageThreadsKeys.list());
    expect(invalidatedKeys).toContainEqual(messagesKeys.detail('thread-1'));
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('does not toast when message.sent arrives for the currently open thread', async () => {
    setOpenThreadId('thread-1');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderSocketHook(queryClient);

    await waitFor(() => expect(registeredHandlers.has('message.sent')).toBe(true));

    fire('message.sent', { threadId: 'thread-1', messageId: 'message-1' });

    expect(toast).not.toHaveBeenCalled();
  });

  it('invalidates the thread list and the specific thread on message.read, without toasting', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderSocketHook(queryClient);

    await waitFor(() => expect(registeredHandlers.has('message.read')).toBe(true));

    fire('message.read', { threadId: 'thread-2' });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    expect(invalidatedKeys).toContainEqual(messageThreadsKeys.list());
    expect(invalidatedKeys).toContainEqual(messagesKeys.detail('thread-2'));
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('useRealtimeConnectionState', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    tokenStorage.setAccessToken('fake-token', new Date(Date.now() + 60_000).toISOString());
    registeredHandlers.clear();
    fakeSocket.connected = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    tokenStorage.clear();
  });

  it('reflects connect/disconnect events from the shared socket', async () => {
    function Indicator() {
      const isConnected = useRealtimeConnectionState();
      return <span>{isConnected ? 'connected' : 'reconnecting'}</span>;
    }
    function Root() {
      useRealtimeSocket();
      return <Indicator />;
    }
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <Wrapper queryClient={queryClient}>
        <Root />
      </Wrapper>,
    );

    await waitFor(() => expect(registeredHandlers.has('connect')).toBe(true));
    expect(screen.getByText('reconnecting')).toBeInTheDocument();

    act(() => fire('connect'));
    expect(await screen.findByText('connected')).toBeInTheDocument();

    act(() => fire('disconnect'));
    expect(await screen.findByText('reconnecting')).toBeInTheDocument();
  });
});
