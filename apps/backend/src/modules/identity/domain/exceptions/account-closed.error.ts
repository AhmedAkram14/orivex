import { IdentityDomainError } from './identity-domain.error.js';

export class AccountClosedError extends IdentityDomainError {
  constructor(accountId: string) {
    super(`Account "${accountId}" is closed and cannot be suspended.`);
  }
}
