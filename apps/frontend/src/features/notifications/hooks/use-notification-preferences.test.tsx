import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { notificationsApi } from '@/features/notifications/api/notifications-api';
import type { NotificationPreferences } from '@/features/notifications/api/types';

import { useNotificationPreferences } from './use-notification-preferences';

vi.mock('@/features/notifications/api/notifications-api', () => ({
  notificationsApi: { getPreferences: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useNotificationPreferences', () => {
  it('returns the caller-scoped preferences from GET /notifications/preferences', async () => {
    const preferences: NotificationPreferences = {
      emailAppointments: true,
      emailBilling: false,
      inAppAppointments: true,
      inAppBilling: true,
      emailNewDeviceLogin: true,
    };
    vi.mocked(notificationsApi.getPreferences).mockResolvedValue(preferences);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(preferences);
    expect(notificationsApi.getPreferences).toHaveBeenCalledTimes(1);
  });
});
