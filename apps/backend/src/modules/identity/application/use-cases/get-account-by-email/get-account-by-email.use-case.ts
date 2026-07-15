import type { Account } from '../../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';

import type { GetAccountByEmailQuery } from './get-account-by-email.query.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// identity.module.ts only. Added for AuthenticationModule's login/forgot-
// password flows, which look accounts up by the credential the user
// actually presents (email), not by id — mirrors GetAccountByIdUseCase's
// shape exactly.
export class GetAccountByEmailUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(query: GetAccountByEmailQuery): Promise<Account | null> {
    const email = EmailAddress.create(query.email);
    return this.accountRepository.findByEmail(email);
  }
}
