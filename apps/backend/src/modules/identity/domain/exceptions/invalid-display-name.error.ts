import { IdentityDomainError } from './identity-domain.error.js';

export class InvalidDisplayNameError extends IdentityDomainError {
  constructor(message: string) {
    super(message);
  }
}
