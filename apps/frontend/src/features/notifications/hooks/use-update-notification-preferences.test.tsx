import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/hooks/query-keys';
import type { NotificationPreferences } from '@/features/notifications/api/types';
import { ApiError } from '@/shared/lib/api/client';
import { toast } from '@/shared/ui/use-toast';
import enMessages from '../../../../messages/en.json';

import { useUpdateNotificationPreferences } from './use-update-notification-preferences';

vi.mock('@/features/notifications/api/notifications-api', () => ({
  notificationsApi: { updatePreferences: vi.fn() },
}));
vi.mock('@/shared/ui/use-toast', () => ({ toast: vi.fn() }));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
          {children}
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

const PREFERENCES: NotificationPreferences = {
  emailAppointments: true,
  emailBilling: true,
  inAppAppointments: true,
  inAppBilling: true,
  emailNewDeviceLogin: true,
};

describe('useUpdateNotificationPreferences', () => {
  it('invalidates the preferences query and shows a success toast', async () => {
    vi.mocked(notificationsApi.updatePreferences).mockResolvedValue({ ...PREFERENCES, emailBilling: false });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ emailBilling: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(notificationsApi.updatePreferences).toHaveBeenCalledWith({ emailBilling: false });
    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    expect(invalidatedKeys).toContainEqual(notificationKeys.detail('preferences'));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
  });

  it('shows a danger toast with the error message on failure', async () => {
    vi.mocked(notificationsApi.updatePreferences).mockRejectedValue(
      new ApiError(500, { code: 'internal_error', message: 'Something went wrong', requestId: 'req-1', timestamp: new Date().toISOString() }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ inAppBilling: false });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'danger', description: 'Something went wrong' }));
  });
});
