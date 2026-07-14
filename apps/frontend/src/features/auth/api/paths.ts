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
  refresh: '/auth/refresh',
  session: '/auth/session',
  logout: '/auth/logout',
  logoutAll: '/auth/logout-all',
  deviceSessions: '/auth/sessions',
  loginHistory: '/auth/login-history',
} as const;
