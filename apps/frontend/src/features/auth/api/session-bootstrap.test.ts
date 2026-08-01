import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/shared/auth/token-storage';

const authApiMock = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock('@/features/auth/api/auth-api', () => ({ authApi: authApiMock }));

import { bootstrapSession } from './session-bootstrap';

const user = { id: 'account-1', email: 'patient@orivex.dev', fullName: 'Amina Youssef', roles: ['patient'] as const };

describe('bootstrapSession', () => {
  beforeEach(() => {
    tokenStorage.clear();
    authApiMock.refreshSession.mockReset();
    authApiMock.getSession.mockReset();
  });

  it('refreshes first on a cold start with no access token in memory', async () => {
    authApiMock.refreshSession.mockResolvedValue({ accessToken: 'fresh-token', accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });
    authApiMock.getSession.mockResolvedValue({ user });

    const result = await bootstrapSession();

    expect(authApiMock.refreshSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual(user);
  });

  it('skips refreshSession entirely when a still-valid access token already exists -- this is the fix for the notification-triggered logout race', async () => {
    tokenStorage.setAccessToken('still-valid-token', new Date(Date.now() + 60_000).toISOString());
    authApiMock.getSession.mockResolvedValue({ user });

    const result = await bootstrapSession();

    expect(authApiMock.refreshSession).not.toHaveBeenCalled();
    expect(authApiMock.getSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual(user);
  });

  it('refreshes when the in-memory token has already expired', async () => {
    tokenStorage.setAccessToken('expired-token', new Date(Date.now() - 1_000).toISOString());
    authApiMock.refreshSession.mockResolvedValue({ accessToken: 'fresh-token', accessTokenExpiresAt: '2030-01-01T00:00:00.000Z' });
    authApiMock.getSession.mockResolvedValue({ user });

    await bootstrapSession();

    expect(authApiMock.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('clears the token and returns null when refreshSession fails on a cold start', async () => {
    authApiMock.refreshSession.mockRejectedValue(new Error('no valid refresh cookie'));

    const result = await bootstrapSession();

    expect(result).toBeNull();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
