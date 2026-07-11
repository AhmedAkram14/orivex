import type { Account } from '../entities/account.entity.js';
import type { AccountId } from '../value-objects/account-id.value-object.js';
import type { EmailAddress } from '../value-objects/email-address.value-object.js';

// Port only — one repository per aggregate root (docs/10-backend-
// architecture.md Section 5). No implementation this sprint; a Prisma-backed
// implementation is future infrastructure-layer work. There is deliberately
// no separate repository for UserProfile — it is loaded/saved only as part
// of its owning Account.
export interface AccountRepository {
  findById(id: AccountId): Promise<Account | null>;
  findByEmail(email: EmailAddress): Promise<Account | null>;
  save(account: Account): Promise<void>;
}
