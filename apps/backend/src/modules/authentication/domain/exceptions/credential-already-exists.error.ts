import { AuthenticationDomainError } from './authentication-domain.error.js';

// Closes the same check-then-act race PrismaAccountRepository closes for
// Account.email: two concurrent registrations for the same account could
// both pass RegisterUseCase's flow before either's Credential insert lands.
export class CredentialAlreadyExistsError extends AuthenticationDomainError {
  constructor(accountId: string) {
    super(`A credential already exists for account "${accountId}".`);
  }
}
