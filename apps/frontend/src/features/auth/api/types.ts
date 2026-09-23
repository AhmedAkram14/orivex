import type { AuthenticatedUser } from '@/shared/auth/types';

/**
 * The authentication API contract this feature is built against. A real
 * backend now implements it (AuthenticationModule, Sprint 15 — first-party
 * JWT/argon2, no external IdP; apps/backend/src/modules/authentication),
 * matching these shapes field-for-field; src/mocks/handlers/auth.ts's MSW
 * mocks continue to serve local dev/tests against this same contract.
 * `resendVerification` is also implemented server-side (POST
 * /auth/resend-verification). `deviceSessions`/`loginHistory`/`logoutAll`
 * ARE now implemented server-side too (GET /auth/sessions, DELETE
 * /auth/sessions/:id, POST /auth/logout-all, GET /auth/login-history).
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

/**
 * Doctor Settings Rebuild, Phase 5: matches the real backend's
 * ChangePasswordRequestDto/ChangePasswordResponseDto exactly
 * (POST /auth/change-password, JwtAuthGuard-protected — the accountId comes
 * from the caller's own access token, never a request field). A wrong
 * `currentPassword` surfaces as `ApiError.code === AUTH_ERROR_CODES.invalidCredentials`,
 * same code login itself uses -- the UI gives it a clearer, change-password-
 * specific message rather than login's generic "invalid email or password" wording.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  status: 'changed';
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

/**
 * Matches the real backend's DeviceSessionResponseDto exactly
 * (apps/backend/.../authentication/presentation/dto/device-session-response.dto.ts).
 * Security Center rework: browser/os/deviceType/displayName/city/country are
 * enriched server-side (parseUserAgent()/resolveIpLocation(), computed on
 * read, never stored) -- this type mirrors that response, not a client-side
 * guess from the raw userAgent string.
 */
export interface DeviceSession {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  lastActiveAt: string;
  isCurrent: boolean;
  browser?: string;
  browserVersion?: string;
  os?: string;
  deviceType?: string;
  displayName: string;
  isUnrecognizedClient: boolean;
  city?: string;
  country?: string;
}

export type LoginHistoryOutcome = 'success' | 'failed' | 'locked';

/** Matches the backend's LoginFailureReason enum -- only ever present on a non-success outcome, and `unknown_user` is reserved but never actually emitted (see the backend enum's own comment: there's no account to attach that event to). */
export type LoginFailureReason = 'wrong_password' | '2fa_failed' | 'locked' | 'unknown_user';

/**
 * Matches the real backend's LoginHistoryEntryResponseDto exactly.
 * browser/os/displayName/city/country are enriched the same way
 * DeviceSession's are; `reason` is present only for a non-success outcome.
 */
export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  outcome: LoginHistoryOutcome;
  browser?: string;
  os?: string;
  displayName: string;
  city?: string;
  country?: string;
  reason?: LoginFailureReason;
}

export type LoginHistoryOutcomeFilter = 'all' | 'success' | 'failed';

export interface LoginHistoryQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  outcome?: LoginHistoryOutcomeFilter;
}

/** Matches the backend's LoginHistoryPageResponseDto -- page-based, driving `shared/ui/pagination.tsx`'s `{ page, pageCount }` contract directly. */
export interface LoginHistoryPage {
  items: LoginHistoryEntry[];
  total: number;
  page: number;
  pageCount: number;
}

export interface LastSignInSummary {
  at: string;
  displayName: string;
  city?: string;
  country?: string;
}

/** Matches the backend's SecuritySummaryResponseDto (GET /auth/security-summary). `twoFactorEnabled` is always `false` today -- no 2FA implementation exists anywhere in this codebase yet. */
export interface SecuritySummary {
  activeSessionCount: number;
  lastSignIn?: LastSignInSummary;
  passwordChangedAt?: string;
  twoFactorEnabled: boolean;
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
