import type { AuthenticatedUser } from '@/shared/auth/types';
import type { DeviceSession, LoginHistoryEntry } from '@/features/auth/api/types';
import {
  DEMO_DOCTORS,
  DEMO_HOSPITAL_ADMIN,
  DEMO_PASSWORD,
  DEMO_PATIENTS,
  DEMO_SUPER_ADMIN,
} from '@/mocks/demo-data/demo-people';

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
  /** Root-relative path served by this app's own `public/` folder. Absent for the legacy edge-case accounts below, which correctly fall back to an initials avatar. */
  avatarUrl?: string;
}

/**
 * Demo Data & Profile Avatar Pass: the two original *persona* accounts
 * (`doctor@orivex.dev` / `patient@orivex.dev`) keep working exactly as
 * before -- the existing test suite logs in as them and asserts their names
 * -- but they no longer share an account id with a real demo person.
 * `demo-people.ts` already claims `user-doctor-1`/`user-patient-1` for
 * Dr. Omar Hassan and Ahmed Ali, so these two get their own ids and their
 * own (unchanged) profiles in `doctor-store.ts`/`patient-store.ts`.
 * `admin@orivex.dev` needs no such split: `DEMO_SUPER_ADMIN` is the very
 * same account (same email, same `user-admin-1` id, same name).
 */
export const LEGACY_DOCTOR_ACCOUNT_ID = 'user-doctor-legacy-1';
export const LEGACY_PATIENT_ACCOUNT_ID = 'user-patient-legacy-1';

const demoAccounts: MockAccount[] = [
  ...DEMO_DOCTORS.map((doctor) => ({
    id: doctor.accountId,
    email: doctor.email,
    password: DEMO_PASSWORD,
    fullName: doctor.displayName,
    roles: ['doctor'] as AuthenticatedUser['roles'],
    emailVerified: true,
    locked: false,
    avatarUrl: doctor.avatarUrl,
  })),
  ...DEMO_PATIENTS.map((patient) => ({
    id: patient.accountId,
    email: patient.email,
    password: DEMO_PASSWORD,
    fullName: patient.displayName,
    roles: ['patient'] as AuthenticatedUser['roles'],
    emailVerified: true,
    locked: false,
    avatarUrl: patient.avatarUrl,
  })),
  {
    id: DEMO_SUPER_ADMIN.accountId,
    email: DEMO_SUPER_ADMIN.email,
    password: DEMO_PASSWORD,
    fullName: DEMO_SUPER_ADMIN.displayName,
    roles: ['super_admin'],
    emailVerified: true,
    locked: false,
  },
  {
    id: DEMO_HOSPITAL_ADMIN.accountId,
    email: DEMO_HOSPITAL_ADMIN.email,
    password: DEMO_PASSWORD,
    fullName: DEMO_HOSPITAL_ADMIN.displayName,
    roles: ['hospital_admin'],
    emailVerified: true,
    locked: false,
  },
];

/**
 * Kept verbatim (bar the id split explained above): the existing suite
 * relies on all four -- `session-provider.test.tsx` logs in as
 * `doctor@orivex.dev` and asserts "Dr. Sarah Ahmed", `login-form.test.tsx`
 * drives `patient@orivex.dev`, and the locked/unverified pair are the only
 * way to exercise those two auth failure branches. No avatar: they're
 * edge-case test accounts, not demo personas, so initials are correct.
 */
const legacyAccounts: MockAccount[] = [
  {
    id: LEGACY_DOCTOR_ACCOUNT_ID,
    email: 'doctor@orivex.dev',
    password: 'Password123!',
    fullName: 'Dr. Sarah Ahmed',
    roles: ['doctor'],
    emailVerified: true,
    locked: false,
  },
  {
    id: LEGACY_PATIENT_ACCOUNT_ID,
    email: 'patient@orivex.dev',
    password: 'Password123!',
    fullName: 'Amina Youssef',
    roles: ['patient'],
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

export const MOCK_ACCOUNTS: MockAccount[] = [...demoAccounts, ...legacyAccounts];

const MAX_ATTEMPTS_BEFORE_LOCKOUT_WARNING = 5;
const SESSION_MARKER_KEY = 'mock-auth-session-account-id';

const failedAttemptsByEmail = new Map<string, number>();

/**
 * A real backend would keep the refresh token itself in an httpOnly
 * cookie the browser sends automatically — this mock has no real cookie
 * jar, so it persists a *marker* (which mock account is "logged in") in
 * `sessionStorage` purely so Silent Refresh / Session Recovery are
 * demonstrable across a real page reload, the way they would need to be
 * against a real backend. This is a mock-testing convenience, not part of
 * the actual security design — `shared/auth/token-storage.ts`'s access
 * token, the thing that actually matters for XSS exposure, still lives in
 * memory only and is never touched here.
 */
function readPersistedAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_MARKER_KEY);
}

function persistAccountId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    window.sessionStorage.setItem(SESSION_MARKER_KEY, id);
  } else {
    window.sessionStorage.removeItem(SESSION_MARKER_KEY);
  }
}

let currentSessionAccountId: string | null = readPersistedAccountId();
let currentAccessToken: string | null = null;

const mockDeviceSessions: DeviceSession[] = [
  {
    id: 'session-current',
    userAgent: 'Chrome on Windows',
    ipAddress: '10.0.0.1',
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: 'session-phone',
    userAgent: 'Safari on iPhone 15',
    ipAddress: '10.0.0.2',
    lastActiveAt: new Date(Date.now() - 86_400_000).toISOString(),
    isCurrent: false,
  },
];

const mockLoginHistory: LoginHistoryEntry[] = [
  {
    id: 'history-1',
    timestamp: new Date().toISOString(),
    ipAddress: '10.0.0.1',
    userAgent: 'Chrome on Windows',
    outcome: 'success',
  },
  {
    id: 'history-2',
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    ipAddress: '10.0.0.9',
    userAgent: 'Firefox on Linux',
    outcome: 'failed',
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
  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    roles: account.roles,
    avatarUrl: account.avatarUrl,
  };
}

export function findAccountById(id: string | undefined): MockAccount | undefined {
  if (!id) return undefined;
  return MOCK_ACCOUNTS.find((account) => account.id === id);
}

export function startSession(account: MockAccount): string {
  currentSessionAccountId = account.id;
  persistAccountId(account.id);
  currentAccessToken = `mock-access-token.${account.id}.${Date.now()}`;
  return currentAccessToken;
}

export function endSession(): void {
  currentSessionAccountId = null;
  persistAccountId(null);
  currentAccessToken = null;
}

export function getCurrentAccount(): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((account) => account.id === currentSessionAccountId);
}

/**
 * Demo Data & Profile Avatar Pass: the account id backing the current mock
 * session, or `undefined` when nobody is logged in. `request-account.ts`
 * uses this as the fallback behind the bearer token it prefers to read.
 */
export function getCurrentAccountId(): string | undefined {
  return currentSessionAccountId ?? undefined;
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
