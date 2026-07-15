import type { Account } from '../../../../identity/domain/entities/account.entity.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';

import type { GetCurrentSessionQuery } from './get-current-session.query.js';

// Thin delegation to Identity's exported read — backs both GET /auth/me and
// the GET /auth/session alias the frontend's session-bootstrap flow expects.
// A pure read: returns null on absence, same convention as
// GetAccountByIdUseCase itself.
export class GetCurrentSessionUseCase {
  constructor(private readonly getAccountByIdUseCase: GetAccountByIdUseCase) {}

  async execute(query: GetCurrentSessionQuery): Promise<Account | null> {
    return this.getAccountByIdUseCase.execute({ accountId: query.accountId });
  }
}
