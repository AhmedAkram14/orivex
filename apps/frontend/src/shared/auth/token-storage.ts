/**
 * Secure storage strategy (Security section): the access token lives in
 * memory only — a module-level variable, never `localStorage` or
 * `sessionStorage` — so it isn't readable by an XSS payload that can
 * execute arbitrary JS but can't reach into another closure's private
 * state. It's lost on tab close/reload by design; `AuthProvider`'s silent
 * session-recovery-on-load call is what re-establishes it, backed by
 * whatever long-lived credential the real backend eventually issues (a
 * Keycloak refresh token, expected to live in an httpOnly cookie the
 * browser sends automatically — this module never touches it, since JS
 * that can read an httpOnly cookie wouldn't be httpOnly).
 *
 * Exposed as an interface + a default in-memory implementation, not a
 * bare module-level function pair, so a test can substitute its own
 * instance instead of mutating shared module state between tests.
 */
export interface TokenStorage {
  getAccessToken(): string | null;
  getExpiresAt(): string | null;
  setAccessToken(token: string, expiresAt: string): void;
  clear(): void;
}

export function createMemoryTokenStorage(): TokenStorage {
  let accessToken: string | null = null;
  let expiresAt: string | null = null;

  return {
    getAccessToken: () => accessToken,
    getExpiresAt: () => expiresAt,
    setAccessToken: (token, expires) => {
      accessToken = token;
      expiresAt = expires;
    },
    clear: () => {
      accessToken = null;
      expiresAt = null;
    },
  };
}

/** The one instance the running app actually uses — AuthProvider and shared/lib/api/client.ts's header-injection closure both read from this same storage. */
export const tokenStorage = createMemoryTokenStorage();
