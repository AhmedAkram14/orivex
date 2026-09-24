import { apiFetch } from '@/shared/lib/api/client';
import { AUTH_PATHS } from '@/features/auth/api/paths';
import { withCrossTabRefreshLock } from '@/shared/auth/cross-tab-refresh-lock';
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  RefreshSessionResponse,
  SessionResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  DeviceSession,
  LoginHistoryPage,
  LoginHistoryQuery,
  SecuritySummary,
} from '@/features/auth/api/types';

// The refresh-token endpoint rotates the token on every real use (Sprint
// 15's RefreshSessionUseCase) and treats a second presentation of an
// already-rotated-away token as reuse. Two independent triggers call
// refreshSession() in this app -- useSilentRefresh's expiry timer and
// bootstrapSession's cold-start recovery -- and without this guard, two
// calls landing close together (e.g. a WebSocket notification forcing a
// session refetch right as the silent-refresh timer also fires) would each
// send a request; the second one to reach the server presents a token the
// first has already rotated past, gets a hard failure, and the caller
// treats that as "no session" -- a real, spurious logout. Coalescing
// concurrent calls into the one in-flight request/promise removes the race
// entirely, regardless of how many places end up triggering a refresh --
// but only within this one tab's own JS module instance.
//
// Phase 9 [VERIFY]: the identical race exists ACROSS tabs, since each tab
// runs its own independent copy of this module (own `inFlightRefresh`, own
// `useSilentRefresh` timer) while all of them share the one httpOnly
// refresh-token cookie. `withCrossTabRefreshLock` (shared/auth/
// cross-tab-refresh-lock.ts) closes that gap using the Web Locks API so
// only one tab's request is ever in flight at a time, browser-wide.
let inFlightRefresh: Promise<RefreshSessionResponse> | null = null;

function buildLoginHistoryQuery(params: LoginHistoryQuery): string {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.outcome) query.set('outcome', params.outcome);
  const qs = query.toString();
  return qs ? `${AUTH_PATHS.loginHistory}?${qs}` : AUTH_PATHS.loginHistory;
}

function refreshSession(): Promise<RefreshSessionResponse> {
  if (!inFlightRefresh) {
    inFlightRefresh = withCrossTabRefreshLock(() =>
      apiFetch<RefreshSessionResponse>({ method: 'POST', path: AUTH_PATHS.refresh }),
    ).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

/**
 * The only module that talks to `/auth/*`. Every function here is a thin,
 * typed wrapper over `apiFetch` — no business logic, no state, so that
 * switching between the MSW mock backend and the real one (Authentication
 * Module, Sprint 15) is purely an env-config concern, never a change to a
 * caller. Callers (features/auth/hooks/) never import `apiFetch` directly
 * for auth concerns.
 */
export const authApi = {
  login: (request: LoginRequest) =>
    apiFetch<LoginResponse>({ method: 'POST', path: AUTH_PATHS.login, body: request }),

  register: (request: RegisterRequest) =>
    apiFetch<RegisterResponse>({ method: 'POST', path: AUTH_PATHS.register, body: request }),

  forgotPassword: (request: ForgotPasswordRequest) =>
    apiFetch<ForgotPasswordResponse>({ method: 'POST', path: AUTH_PATHS.forgotPassword, body: request }),

  resetPassword: (request: ResetPasswordRequest) =>
    apiFetch<ResetPasswordResponse>({ method: 'POST', path: AUTH_PATHS.resetPassword, body: request }),

  verifyEmail: (request: VerifyEmailRequest) =>
    apiFetch<VerifyEmailResponse>({ method: 'POST', path: AUTH_PATHS.verifyEmail, body: request }),

  resendVerification: (request: ResendVerificationRequest) =>
    apiFetch<ResendVerificationResponse>({ method: 'POST', path: AUTH_PATHS.resendVerification, body: request }),

  changePassword: (request: ChangePasswordRequest) =>
    apiFetch<ChangePasswordResponse>({ method: 'POST', path: AUTH_PATHS.changePassword, body: request }),

  refreshSession,

  /** Silent recovery on app load — resolves to `null` (not a thrown error) when there's no active session. */
  getSession: () => apiFetch<SessionResponse>({ path: AUTH_PATHS.session }),

  logout: () => apiFetch<void>({ method: 'POST', path: AUTH_PATHS.logout }),

  logoutAllDevices: () => apiFetch<void>({ method: 'POST', path: AUTH_PATHS.logoutAll }),

  getDeviceSessions: () => apiFetch<DeviceSession[]>({ path: AUTH_PATHS.deviceSessions }),

  revokeDeviceSession: (sessionId: string) =>
    apiFetch<void>({ method: 'DELETE', path: `${AUTH_PATHS.deviceSessions}/${sessionId}` }),

  revokeOtherSessions: () => apiFetch<void>({ method: 'POST', path: AUTH_PATHS.revokeOtherSessions }),

  getLoginHistory: (params: LoginHistoryQuery = {}) =>
    apiFetch<LoginHistoryPage>({ path: buildLoginHistoryQuery(params) }),

  getSecuritySummary: () => apiFetch<SecuritySummary>({ path: AUTH_PATHS.securitySummary }),
};
