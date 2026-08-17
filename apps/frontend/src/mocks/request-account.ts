import { getCurrentAccountId } from '@/mocks/auth-store';

/**
 * Demo Data & Profile Avatar Pass: resolves *which mock account* an
 * intercepted request belongs to, so every per-account mock store
 * (`doctor-store.ts`, `patient-store.ts`, `notifications-store.ts`, ...) can
 * answer for the account that actually made the call instead of a fixed
 * singleton.
 *
 * Preferred source is the request itself: `auth-store.ts`'s `startSession()`
 * mints `mock-access-token.${accountId}.${timestamp}`, and the real API
 * client sends it as `Authorization: Bearer ...`, so the account id is
 * genuinely request-scoped -- the same place a real backend would read it
 * from (its JWT `sub`).
 *
 * Falls back to `auth-store.ts`'s own "who is logged in" session marker when
 * no bearer token is present. That covers the two real cases where one
 * legitimately isn't: a component test that renders a page without driving
 * the login form at all (no token is ever stored), and the brief window
 * during Session Recovery before the refreshed access token exists.
 *
 * Returns `undefined` when neither source knows -- callers decide what that
 * means for their own endpoint (each store falls back to its legacy fixture
 * account, which is what keeps the existing test suite's no-session
 * rendering path working unchanged).
 */
const MOCK_TOKEN_PREFIX = 'mock-access-token.';

export function parseAccountIdFromToken(token: string | undefined | null): string | undefined {
  if (!token || !token.startsWith(MOCK_TOKEN_PREFIX)) return undefined;
  const accountId = token.slice(MOCK_TOKEN_PREFIX.length).split('.')[0];
  return accountId || undefined;
}

export function resolveRequestAccountId(request?: Request): string | undefined {
  const header = request?.headers.get('authorization') ?? request?.headers.get('Authorization');
  const token = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : undefined;
  return parseAccountIdFromToken(token) ?? getCurrentAccountId();
}
