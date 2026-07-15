import { AuthenticationDomainError } from './authentication-domain.error.js';

export class TokenExpiredError extends AuthenticationDomainError {
  constructor() {
    super('Token has expired.');
  }
}
