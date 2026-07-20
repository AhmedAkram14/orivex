import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { adminApi } from '@/features/admin/api/admin-api';
import { adminHospitalsKeys, platformKpisKeys } from '@/features/admin/hooks/query-keys';
import type { Hospital } from '@/features/admin/api/types';

import { useCreateHospital } from './use-create-hospital';

vi.mock('@/features/admin/api/admin-api', () => ({
  adminApi: { createHospital: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useCreateHospital', () => {
  it('invalidates the hospitals list and platform KPIs after creating a hospital', async () => {
    vi.mocked(adminApi.createHospital).mockResolvedValue({ id: 'hosp-1', name: 'Cairo General' } as Hospital);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateHospital(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ name: 'Cairo General' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    expect(invalidatedKeys).toContainEqual(adminHospitalsKeys.all);
    expect(invalidatedKeys).toContainEqual(platformKpisKeys.all);
  });
});
