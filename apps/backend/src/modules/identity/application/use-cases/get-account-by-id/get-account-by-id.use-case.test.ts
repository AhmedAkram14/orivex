import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Account } from '../../../domain/entities/account.entity.js';
import { AccountRole } from '../../../domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { DisplayName } from '../../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';

import { GetAccountByIdUseCase } from './get-account-by-id.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account | null) {}

  findById(): Promise<Account | null> {
    return Promise.resolve(this.account);
  }

  findByEmail(): Promise<Account | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

describe('GetAccountByIdUseCase', () => {
  it('returns the account when it exists', async () => {
    const account = Account.register({
      email: EmailAddress.create('found@example.com'),
      keycloakId: 'kc-found',
      role: AccountRole.Patient,
      displayName: DisplayName.create('Found User'),
    });
    const useCase = new GetAccountByIdUseCase(new FakeAccountRepository(account));

    const result = await useCase.execute({ accountId: account.getId().toString() });

    assert.equal(result, account);
  });

  it('returns null (not a thrown error) when the account does not exist', async () => {
    const useCase = new GetAccountByIdUseCase(new FakeAccountRepository(null));

    const result = await useCase.execute({ accountId: '11111111-1111-4111-8111-111111111111' });

    assert.equal(result, null);
  });
});
