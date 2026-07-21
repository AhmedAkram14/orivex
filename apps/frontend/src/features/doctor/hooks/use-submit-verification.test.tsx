import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { doctorApi } from '@/features/doctor/api/doctor-api';
import { doctorVerificationsKeys } from '@/features/doctor/hooks/query-keys';
import type { VerificationCase } from '@/features/doctor/api/types';

import { useSubmitVerification } from './use-submit-verification';

vi.mock('@/features/doctor/api/doctor-api', () => ({
  doctorApi: { submitVerification: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useSubmitVerification', () => {
  it('invalidates the applicant\'s own verification history after a successful submission', async () => {
    vi.mocked(doctorApi.submitVerification).mockResolvedValue({ id: 'case-1', status: 'submitted' } as VerificationCase);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSubmitVerification('doctor-profile-1'), {
      wrapper: createWrapper(queryClient),
    });
    result.current.mutate({ licenseNumber: 'LIC-1', specialtyCode: 'Cardiology', documentAssetIds: ['asset-1'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    expect(invalidatedKeys).toContainEqual(doctorVerificationsKeys.detail('doctor-profile-1'));
  });
});
