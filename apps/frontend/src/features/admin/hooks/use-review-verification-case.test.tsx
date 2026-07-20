import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { adminApi } from '@/features/admin/api/admin-api';
import { adminVerificationQueueKeys } from '@/features/admin/hooks/query-keys';
import type { VerificationCase } from '@/features/admin/api/types';

import { useReviewVerificationCase } from './use-review-verification-case';

vi.mock('@/features/admin/api/admin-api', () => ({
  adminApi: { reviewVerificationCase: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useReviewVerificationCase', () => {
  it('invalidates the verification queue after a decision is recorded', async () => {
    vi.mocked(adminApi.reviewVerificationCase).mockResolvedValue({ id: 'case-1', status: 'approved' } as VerificationCase);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useReviewVerificationCase(), { wrapper: createWrapper(queryClient) });
    result.current.mutate({ id: 'case-1', request: { status: 'approved' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey?: unknown } | undefined)?.queryKey);
    expect(invalidatedKeys).toContainEqual(adminVerificationQueueKeys.all);
  });
});
