import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/features/auth/api/auth-api';
import { AUTH_ERROR_CODES } from '@/features/auth/api/types';
import { ApiError } from '@/shared/lib/api/client';
import { toast } from '@/shared/ui/use-toast';
import enMessages from '../../../../messages/en.json';

import { useChangePassword } from './use-change-password';

vi.mock('@/features/auth/api/auth-api', () => ({
  authApi: { changePassword: vi.fn() },
}));
vi.mock('@/shared/ui/use-toast', () => ({ toast: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="Africa/Cairo">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('useChangePassword', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });


  it('calls the real change-password endpoint and shows a success toast', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue({ status: 'changed' });
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    result.current.mutate({ currentPassword: 'OldPassword123', newPassword: 'NewPassword123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword123',
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success', description: 'Password changed.' }));
  });

  it('surfaces a wrong-current-password failure as an INVALID_CREDENTIALS ApiError without toasting', async () => {
    const error = new ApiError(401, {
      code: AUTH_ERROR_CODES.invalidCredentials,
      message: 'Invalid email or password.',
      requestId: 'req-1',
      timestamp: new Date().toISOString(),
    });
    vi.mocked(authApi.changePassword).mockRejectedValue(error);
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    result.current.mutate({ currentPassword: 'WrongPassword123', newPassword: 'NewPassword123' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe(AUTH_ERROR_CODES.invalidCredentials);
    expect(toast).not.toHaveBeenCalled();
  });
});
