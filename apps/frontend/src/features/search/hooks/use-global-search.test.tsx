import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { searchApi } from '@/features/search/api/search-api';
import { useGlobalSearch } from '@/features/search/hooks/use-global-search';

vi.mock('@/features/search/api/search-api', () => ({
  searchApi: { search: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useGlobalSearch', () => {
  it('stays disabled and never calls the API for a (trimmed) query under 2 characters', async () => {
    vi.mocked(searchApi.search).mockResolvedValue({ results: [], total: 0 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useGlobalSearch({ q: ' s ' }), { wrapper: createWrapper(queryClient) });

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(result.current.fetchStatus).toBe('idle');
    expect(searchApi.search).not.toHaveBeenCalled();
  });

  it('debounces rapid changes and fires a single trimmed-query request once the value settles at 2+ characters', async () => {
    vi.mocked(searchApi.search).mockResolvedValue({ results: [], total: 0 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Mounts at '' (matching the real component -- the palette always mounts
    // with an empty query, then re-renders as the user types), so the debounce
    // effect genuinely governs every update below rather than the first one
    // eagerly seeding React Query's `enabled` before any timer has a chance
    // to run.
    const { result, rerender } = renderHook(({ q }) => useGlobalSearch({ q }), {
      wrapper: createWrapper(queryClient),
      initialProps: { q: '' },
    });
    rerender({ q: 'sa' });
    rerender({ q: 'sar' });
    rerender({ q: 'sara' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 2000 });

    expect(searchApi.search).toHaveBeenCalledTimes(1);
    expect(searchApi.search).toHaveBeenCalledWith({ q: 'sara', type: undefined });
  });

  it('passes the optional type filter straight through once enabled', async () => {
    vi.mocked(searchApi.search).mockResolvedValue({ results: [], total: 0 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useGlobalSearch({ q: 'doctor', type: 'doctor' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 2000 });

    expect(searchApi.search).toHaveBeenCalledWith({ q: 'doctor', type: 'doctor' });
  });
});
