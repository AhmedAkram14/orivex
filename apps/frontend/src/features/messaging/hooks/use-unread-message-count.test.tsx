import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { useUnreadMessageCount } from '@/features/messaging/hooks/use-unread-message-count';
import { server } from '@/mocks/server';
import { LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID } from '@/mocks/auth-store';
import { resetMessagingStore, sendMessage, startOrGetThread } from '@/mocks/messaging-store';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMessagingStore();
});
afterAll(() => server.close());

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useUnreadMessageCount', () => {
  it('reports 0 when the caller has no unread messages', async () => {
    const { result } = renderHook(() => useUnreadMessageCount(), { wrapper });
    await waitFor(() => expect(result.current).toBe(0));
  });

  it("reflects GET /message-threads/unread-count's real count", async () => {
    // `resolveRequestAccountId` falls back to `LEGACY_PATIENT_ACCOUNT_ID`
    // with no bearer token/session marker present, same as every other
    // mock-store test in this suite.
    const thread = startOrGetThread(LEGACY_DOCTOR_ACCOUNT_ID, LEGACY_PATIENT_ACCOUNT_ID);
    sendMessage(thread.id, LEGACY_DOCTOR_ACCOUNT_ID, 'Please see the attached labs.');

    const { result } = renderHook(() => useUnreadMessageCount(), { wrapper });
    await waitFor(() => expect(result.current).toBe(1));
  });
});
