// Lockout policy (docs/10-backend-architecture.md's AuthenticationModule
// entry, Security: "Account lock after repeated failures"). Imported
// directly by Credential/PlainPassword rather than threaded through every
// caller as parameters — mirrors Identity's MAX_DISPLAY_NAME_LENGTH pattern.
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 10;
