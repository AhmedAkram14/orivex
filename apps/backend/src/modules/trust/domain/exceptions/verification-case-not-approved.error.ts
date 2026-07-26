import { TrustDomainError } from './trust-domain.error.js';

// Thrown when suspend() is attempted on a case that was never Approved --
// a state conflict (409), mirroring VerificationCaseAlreadyDecidedError's
// own precedent.
export class VerificationCaseNotApprovedError extends TrustDomainError {}
