// Matches docs/09-physical-database.md's security_events table purpose:
// anomalous access/auth events. Populated by AuthenticationModule, the
// actual producer of every one of these outcomes.
export enum SecurityEventType {
  LoginSucceeded = 'login_succeeded',
  LoginFailed = 'login_failed',
  AccountLocked = 'account_locked',
  AccountUnlocked = 'account_unlocked',
  PasswordChanged = 'password_changed',
  PasswordResetRequested = 'password_reset_requested',
  PasswordResetCompleted = 'password_reset_completed',
  EmailVerified = 'email_verified',
  SessionRevoked = 'session_revoked',
  RefreshTokenReuseDetected = 'refresh_token_reuse_detected',
}
