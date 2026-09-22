// Recorded in a LoginFailed/AccountLocked SecurityEvent's metadata as
// { reason }. Never surfaced in the login endpoint's own error response
// (which always throws the same InvalidCredentialsError/AccountLockedError
// regardless of reason -- no user-enumeration signal) -- only visible later,
// to the account owner themselves, on their own GET /auth/login-history.
// TwoFactorFailed is reserved for when 2FA ships; nothing sets it today.
export enum LoginFailureReason {
  WrongPassword = 'wrong_password',
  TwoFactorFailed = '2fa_failed',
  Locked = 'locked',
  UnknownUser = 'unknown_user',
}
