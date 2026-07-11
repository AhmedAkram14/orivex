import { IdentityDomainError } from './identity-domain.error.js';

export class InvalidEmailAddressError extends IdentityDomainError {
  constructor(value: string) {
    super(`EmailAddress must be a valid email address, received: "${value}".`);
  }
}
