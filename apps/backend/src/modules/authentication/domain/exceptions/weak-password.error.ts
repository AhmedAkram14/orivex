import { AuthenticationDomainError } from './authentication-domain.error.js';

export class WeakPasswordError extends AuthenticationDomainError {
  constructor(reason: string) {
    super(`Password does not meet strength requirements: ${reason}`);
  }
}
