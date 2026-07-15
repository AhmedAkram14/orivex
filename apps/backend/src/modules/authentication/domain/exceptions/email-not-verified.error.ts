import { AuthenticationDomainError } from './authentication-domain.error.js';

export class EmailNotVerifiedError extends AuthenticationDomainError {
  constructor() {
    super('Email address has not been verified.');
  }
}
