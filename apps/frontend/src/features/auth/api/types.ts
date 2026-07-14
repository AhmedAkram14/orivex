import type { AuthenticatedUser } from '@/shared/auth/types';

/**
 * The authentication API contract this feature is built against. Backend
 * authentication does not exist yet (Phase 4, 🔒 blocked on Keycloak —
 * see docs/roadmaps/frontend-master-plan.md); every one of these shapes is
 * served today by src/mocks/handlers/auth.ts via MSW, not a real server.
 * When Keycloak integration lands, only auth-api.ts's function bodies
 * change — these types, and everything that imports them, do not, unless
 * the real contract genuinely differs from what's modeled here.
 */

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
  accessTokenExpiresAt: string;
  /**
   * MFA readiness (Security section: "MFA readiness") — the field exists
   * in the contract so a future MFA verification step doesn't require a
   * breaking response-shape change. No mock user sets this to `true` and
   * no verification UI exists yet; this phase prepares the type, not the
   * flow. Deliberately not branched on anywhere in this codebase yet — a
   * branch nothing ever exercises would be untested dead code, which this
   * phase's own engineering-quality bar forbids.
   */
  mfaRequired: boolean;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  status: 'verification_required';
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  status: 'sent';
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  status: 'reset';
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  status: 'verified';
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  status: 'sent';
}

export interface RefreshSessionResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
}

/** `null` means no active session — not an error, the normal "logged out" outcome of a silent-recovery check on app load. */
export type SessionResponse = { user: AuthenticatedUser } | null;

export interface DeviceSession {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export type LoginHistoryOutcome = 'success' | 'failed_password' | 'failed_locked';

export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  ipAddress: string;
  location: string;
  device: string;
  outcome: LoginHistoryOutcome;
}

/**
 * Error codes the mock backend (and, later, the real one) uses in
 * `ApiError.code` for auth-specific outcomes the UI reacts to distinctly —
 * e.g. routing to Account Locked vs. showing an inline "wrong password"
 * message. Not an exhaustive HTTP-status mapping; only the codes this
 * feature's pages actually branch on.
 */
export const AUTH_ERROR_CODES = {
  invalidCredentials: 'INVALID_CREDENTIALS',
  accountLocked: 'ACCOUNT_LOCKED',
  tooManyAttempts: 'TOO_MANY_ATTEMPTS',
  emailNotVerified: 'EMAIL_NOT_VERIFIED',
  tokenExpired: 'TOKEN_EXPIRED',
  tokenInvalid: 'TOKEN_INVALID',
} as const;
