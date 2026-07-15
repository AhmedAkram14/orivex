import { AuthenticationDomainError } from './authentication-domain.error.js';

export class AccountLockedError extends AuthenticationDomainError {
  constructor(public readonly lockedUntil: Date) {
    super(`Account is locked until ${lockedUntil.toISOString()}.`);
  }
}
