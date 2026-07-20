import type { Account } from '../entities/account.entity.js';
import type { AccountRole } from '../enums/account-role.enum.js';
import type { AccountId } from '../value-objects/account-id.value-object.js';
import type { EmailAddress } from '../value-objects/email-address.value-object.js';

export interface ListAccountsOptions {
  limit: number;
  offset: number;
  role?: AccountRole;
}

export interface ListAccountsResult {
  accounts: Account[];
  total: number;
}

// Port only — one repository per aggregate root (docs/10-backend-
// architecture.md Section 5). No implementation this sprint; a Prisma-backed
// implementation is future infrastructure-layer work. There is deliberately
// no separate repository for UserProfile — it is loaded/saved only as part
// of its owning Account.
export interface AccountRepository {
  findById(id: AccountId): Promise<Account | null>;
  findByEmail(email: EmailAddress): Promise<Account | null>;
  // ORIVEX Roadmap 2.0 Stage 4: AdministrationModule's user-management list
  // (ListAccountsUseCase) is the first caller. `total` is a separate count
  // query, not `accounts.length` -- callers need it for pagination metadata
  // even on a partial page.
  findAll(options: ListAccountsOptions): Promise<ListAccountsResult>;
  save(account: Account): Promise<void>;
}
