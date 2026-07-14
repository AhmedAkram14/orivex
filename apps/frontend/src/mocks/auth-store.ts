import type { AuthenticatedUser } from '@/shared/auth/types';
import type { DeviceSession, LoginHistoryEntry } from '@/features/auth/api/types';

/**
 * In-memory mock backend state for the MSW auth handlers ONLY — no
 * application code outside src/mocks/ may import this. It exists to give
 * the mock `/auth/*` endpoints something stateful to react to (a login
 * that "sticks" across subsequent requests in the same tab, a lockout
 * counter, a revocable session list) since there is no real backend yet.
 * Resets on page reload — acceptable for mocking, never a real session
 * store.
 */

interface MockAccount {
  id: string;
  email: string;
  password: string;
  fullName: string;
  roles: AuthenticatedUser['roles'];
  emailVerified: boolean;
  locked: boolean;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: 'user-doctor-1',
    email: 'doctor@orivex.dev',
    password: 'Password123!',
    fullName: 'Dr. Sarah Ahmed',
    roles: ['doctor'],
    emailVerified: true,
    locked: false,
  },
  {
    id: 'user-locked-1',
    email: 'locked@orivex.dev',
    password: 'Password123!',
    fullName: 'Locked Account',
    roles: ['patient'],
    emailVerified: true,
    locked: true,
  },
  {
    id: 'user-unverified-1',
    email: 'unverified@orivex.dev',
    password: 'Password123!',
    fullName: 'Unverified Account',
    roles: ['patient'],
    emailVerified: false,
    locked: false,
  },
];

const MAX_ATTEMPTS_BEFORE_LOCKOUT_WARNING = 5;

const failedAttemptsByEmail = new Map<string, number>();
let currentSessionAccountId: string | null = null;
let currentAccessToken: string | null = null;

const mockDeviceSessions: DeviceSession[] = [
  {
    id: 'session-current',
    deviceName: 'This device',
    browser: 'Chrome',
    os: 'Windows',
    ipAddress: '10.0.0.1',
    location: 'Cairo, Egypt',
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: 'session-phone',
    deviceName: 'iPhone 15',
    browser: 'Safari',
    os: 'iOS',
    ipAddress: '10.0.0.2',
    location: 'Cairo, Egypt',
    lastActiveAt: new Date(Date.now() - 86_400_000).toISOString(),
    isCurrent: false,
  },
];

const mockLoginHistory: LoginHistoryEntry[] = [
  {
    id: 'history-1',
    timestamp: new Date().toISOString(),
    ipAddress: '10.0.0.1',
    location: 'Cairo, Egypt',
    device: 'Chrome on Windows',
    outcome: 'success',
  },
  {
    id: 'history-2',
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    ipAddress: '10.0.0.9',
    location: 'Unknown',
    device: 'Firefox on Linux',
    outcome: 'failed_password',
  },
];

export function findAccountByEmail(email: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((account) => account.email.toLowerCase() === email.toLowerCase());
}

export function recordFailedAttempt(email: string): number {
  const next = (failedAttemptsByEmail.get(email) ?? 0) + 1;
  failedAttemptsByEmail.set(email, next);
  return next;
}

export function isRateLimited(email: string): boolean {
  return (failedAttemptsByEmail.get(email) ?? 0) >= MAX_ATTEMPTS_BEFORE_LOCKOUT_WARNING;
}

export function clearFailedAttempts(email: string): void {
  failedAttemptsByEmail.delete(email);
}

export function toAuthenticatedUser(account: MockAccount): AuthenticatedUser {
  return { id: account.id, email: account.email, fullName: account.fullName, roles: account.roles };
}

export function startSession(account: MockAccount): string {
  currentSessionAccountId = account.id;
  currentAccessToken = `mock-access-token.${account.id}.${Date.now()}`;
  return currentAccessToken;
}

export function endSession(): void {
  currentSessionAccountId = null;
  currentAccessToken = null;
}

export function getCurrentAccount(): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((account) => account.id === currentSessionAccountId);
}

export function isValidAccessToken(token: string | undefined): boolean {
  return !!token && !!currentAccessToken && token === currentAccessToken;
}

export function refreshAccessToken(): string | null {
  if (!currentSessionAccountId) return null;
  currentAccessToken = `mock-access-token.${currentSessionAccountId}.${Date.now()}`;
  return currentAccessToken;
}

export function getDeviceSessions(): DeviceSession[] {
  return mockDeviceSessions;
}

export function revokeDeviceSession(sessionId: string): void {
  const index = mockDeviceSessions.findIndex((session) => session.id === sessionId);
  if (index !== -1) mockDeviceSessions.splice(index, 1);
}

export function getLoginHistory(): LoginHistoryEntry[] {
  return mockLoginHistory;
}
