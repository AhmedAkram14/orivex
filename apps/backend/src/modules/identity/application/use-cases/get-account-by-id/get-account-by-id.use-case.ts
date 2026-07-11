import { Inject, Injectable } from '@nestjs/common';

import type { Account } from '../../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { AccountId } from '../../../domain/value-objects/account-id.value-object.js';
import { ACCOUNT_REPOSITORY } from '../../ports/tokens.js';

import type { GetAccountByIdQuery } from './get-account-by-id.query.js';

// A pure read — returns null on absence rather than throwing. Whether a
// future controller maps that to a 404 is a presentation-layer decision,
// not this use case's.
@Injectable()
export class GetAccountByIdUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository) {}

  async execute(query: GetAccountByIdQuery): Promise<Account | null> {
    const id = AccountId.create(query.accountId);
    return this.accountRepository.findById(id);
  }
}
