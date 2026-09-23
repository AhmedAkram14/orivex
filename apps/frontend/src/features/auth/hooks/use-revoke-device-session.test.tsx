import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/features/auth/api/auth-api';
import type { DeviceSession } from '@/features/auth/api/types';
import { deviceSessionKeys } from '@/features/auth/hooks/query-keys';

import { useRevokeDeviceSession } from './use-revoke-device-session';

vi.mock('@/features/auth/api/auth-api', () => ({
  authApi: { revokeDeviceSession: vi.fn() },
}));

const SESSIONS: DeviceSession[] = [
  {
    id: 'current',
    isCurrent: true,
    displayName: 'Chrome on Windows',
    isUnrecognizedClient: false,
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'other',
    isCurrent: false,
    displayName: 'Safari on iPhone',
    isUnrecognizedClient: false,
    lastActiveAt: new Date().toISOString(),
  },
];

function buildWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useRevokeDeviceSession', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('optimistically removes the row from the cache before the request resolves', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(deviceSessionKeys.list(), SESSIONS);
    let resolveRequest!: () => void;
    vi.mocked(authApi.revokeDeviceSession).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = () => resolve(undefined);
      }),
    );

    const { result } = renderHook(() => useRevokeDeviceSession(), { wrapper: buildWrapper(queryClient) });
    result.current.mutate('other');

    await waitFor(() => {
      const cached = queryClient.getQueryData<DeviceSession[]>(deviceSessionKeys.list());
      expect(cached?.map((s) => s.id)).toEqual(['current']);
    });

    resolveRequest();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back the cache to its pre-mutation snapshot when the request fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(deviceSessionKeys.list(), SESSIONS);
    vi.mocked(authApi.revokeDeviceSession).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useRevokeDeviceSession(), { wrapper: buildWrapper(queryClient) });
    result.current.mutate('other');

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<DeviceSession[]>(deviceSessionKeys.list());
    expect(cached?.map((s) => s.id)).toEqual(['current', 'other']);
  });
});
