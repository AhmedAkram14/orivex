import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { adminApi } from '@/features/admin/api/admin-api';
import { adminAccountsKeys, platformKpisKeys } from '@/features/admin/hooks/query-keys';
import type { AdminAccount } from '@/features/admin/api/types';

import { useUpdateAccountRole } from './use-update-account-role';

vi.mock('@/features/admin/api/admin-api', () => ({
  adminApi: { updateAccountRole: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useUpdateAccountRole', () => {
  it('invalidates the accounts list and platform KPIs after a successful role change', async () => {
    vi.mocked(adminApi.updateAccountRole).mockResolvedValue({ id: 'acct-1', role: 'nurse' } as AdminAccount);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateAccountRole(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ accountId: 'acct-1', role: 'nurse' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    expect(invalidatedKeys).toContainEqual(adminAccountsKeys.all);
    expect(invalidatedKeys).toContainEqual(platformKpisKeys.all);
  });
});
