import { apiFetch } from '@/shared/lib/api/client';
import { AUTH_PATHS } from '@/features/auth/api/paths';
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
  RefreshSessionResponse,
  SessionResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  DeviceSession,
  LoginHistoryEntry,
} from '@/features/auth/api/types';

/**
 * The only module that talks to `/auth/*`. Every function here is a thin,
 * typed wrapper over `apiFetch` — no business logic, no state, so that
 * swapping the mock backend for a real Keycloak-fronted one later is a
 * change to these function bodies (or a new implementation file this
 * module re-exports), never to a caller. Callers (features/auth/hooks/)
 * never import `apiFetch` directly for auth concerns.
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

  refreshSession: () => apiFetch<RefreshSessionResponse>({ method: 'POST', path: AUTH_PATHS.refresh }),

  /** Silent recovery on app load — resolves to `null` (not a thrown error) when there's no active session. */
  getSession: () => apiFetch<SessionResponse>({ path: AUTH_PATHS.session }),

  logout: () => apiFetch<void>({ method: 'POST', path: AUTH_PATHS.logout }),

  logoutAllDevices: () => apiFetch<void>({ method: 'POST', path: AUTH_PATHS.logoutAll }),

  getDeviceSessions: () => apiFetch<DeviceSession[]>({ path: AUTH_PATHS.deviceSessions }),

  revokeDeviceSession: (sessionId: string) =>
    apiFetch<void>({ method: 'DELETE', path: `${AUTH_PATHS.deviceSessions}/${sessionId}` }),

  getLoginHistory: () => apiFetch<LoginHistoryEntry[]>({ path: AUTH_PATHS.loginHistory }),
};
