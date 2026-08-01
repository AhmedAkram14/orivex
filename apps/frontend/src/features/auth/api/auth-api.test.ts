import { describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
vi.mock('@/shared/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { authApi } from './auth-api';

describe('authApi.refreshSession', () => {
  it('coalesces concurrent calls into a single in-flight request, never sending a second refresh while one is pending', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    apiFetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const first = authApi.refreshSession();
    const second = authApi.refreshSession();

    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({ accessToken: 'new-token', accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });

    await expect(first).resolves.toEqual({ accessToken: 'new-token', accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });
    await expect(second).resolves.toEqual({ accessToken: 'new-token', accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });
  });

  it('allows a fresh request once the previous one has settled', async () => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValueOnce({ accessToken: 'token-1', accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });
    apiFetchMock.mockResolvedValueOnce({ accessToken: 'token-2', accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });

    await authApi.refreshSession();
    await authApi.refreshSession();

    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });
});
