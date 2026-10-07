import type { OAuthProvider } from '@/features/auth/api/types';

/**
 * Auth endpoint paths — named once so auth-api.ts and the MSW mock
 * handlers (src/mocks/handlers/auth.ts) reference the exact same strings
 * rather than two hand-typed copies that could silently drift apart.
 */
export const AUTH_PATHS = {
  login: '/auth/login',
  register: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  verifyEmail: '/auth/verify-email',
  resendVerification: '/auth/resend-verification',
  changePassword: '/auth/change-password',
  refresh: '/auth/refresh',
  session: '/auth/session',
  logout: '/auth/logout',
  logoutAll: '/auth/logout-all',
  deviceSessions: '/auth/sessions',
  revokeOtherSessions: '/auth/sessions/revoke-others',
  loginHistory: '/auth/login-history',
  securitySummary: '/auth/security-summary',
  oauthProviders: '/auth/oauth/providers',
} as const;

/**
 * Social Sign-In's entry point (docs/14-adrs.md ADR-008) -- a full-page
 * browser navigation to the backend, never an `apiFetch` call: the backend
 * redirects on to Google/Facebook and, on the way back, to /oauth-callback.
 */
export function oauthStartPath(provider: OAuthProvider): string {
  return `/auth/oauth/${provider}/start`;
}
