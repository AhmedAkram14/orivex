import type { Account } from '../../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';

import type { ListAccountsQuery } from './list-accounts.query.js';

export interface ListAccountsResult {
  accounts: Account[];
  total: number;
}

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// identity.module.ts only.
//
// ORIVEX Roadmap 2.0 Stage 4: AdministrationModule's Users table calls this
// through IdentityModule's export, the same one-way-dependency shape
// GetVerificationReviewQueueUseCase already established for TrustModule.
export class ListAccountsUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(query: ListAccountsQuery): Promise<ListAccountsResult> {
    const offset = (query.page - 1) * query.limit;
    return this.accountRepository.findAll({
      limit: query.limit,
      offset,
      role: query.role,
    });
  }
}
