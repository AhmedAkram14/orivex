import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Account } from '../../../../identity/domain/entities/account.entity.js';
import { AccountRole } from '../../../../identity/domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../../identity/domain/repositories/account.repository.js';
import { DisplayName } from '../../../../identity/domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../../identity/domain/value-objects/email-address.value-object.js';
import { GetAccountByIdUseCase } from '../../../../identity/application/use-cases/get-account-by-id/get-account-by-id.use-case.js';

import { GetCurrentSessionUseCase } from './get-current-session.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account | null) {}
  findById(): Promise<Account | null> {
    return Promise.resolve(this.account);
  }
  findByEmail(): Promise<Account | null> {
    return Promise.resolve(null);
  }

  findAll(): Promise<{ accounts: Account[]; total: number }> {
    return Promise.resolve({ accounts: [], total: 0 });
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

describe('GetCurrentSessionUseCase', () => {
  it('returns the account for a valid accountId', async () => {
    const account = Account.register({
      email: EmailAddress.create('ada@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Ada Lovelace'),
    });
    const useCase = new GetCurrentSessionUseCase(new GetAccountByIdUseCase(new FakeAccountRepository(account)));

    const result = await useCase.execute({ accountId: account.getId().toString() });

    assert.equal(result, account);
  });

  it('returns null when the account does not exist', async () => {
    const useCase = new GetCurrentSessionUseCase(new GetAccountByIdUseCase(new FakeAccountRepository(null)));

    const result = await useCase.execute({ accountId: '11111111-1111-4111-8111-111111111111' });

    assert.equal(result, null);
  });
});
