import type { Account } from '../../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { AccountId } from '../../../domain/value-objects/account-id.value-object.js';

import type { GetAccountByIdQuery } from './get-account-by-id.query.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// identity.module.ts only.
//
// A pure read — returns null on absence rather than throwing. Whether a
// future controller maps that to a 404 is a presentation-layer decision,
// not this use case's.
export class GetAccountByIdUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(query: GetAccountByIdQuery): Promise<Account | null> {
    const id = AccountId.create(query.accountId);
    return this.accountRepository.findById(id);
  }
}
