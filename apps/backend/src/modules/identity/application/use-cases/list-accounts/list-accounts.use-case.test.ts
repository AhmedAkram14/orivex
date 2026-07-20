import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Account } from '../../../domain/entities/account.entity.js';
import { AccountRole } from '../../../domain/enums/account-role.enum.js';
import type {
  AccountRepository,
  ListAccountsOptions,
  ListAccountsResult,
} from '../../../domain/repositories/account.repository.js';
import { DisplayName } from '../../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';

import { ListAccountsQuery } from './list-accounts.query.js';
import { ListAccountsUseCase } from './list-accounts.use-case.js';

class FakeAccountRepository implements AccountRepository {
  public lastOptions: ListAccountsOptions | undefined;

  constructor(private readonly result: ListAccountsResult) {}

  findById(): Promise<Account | null> {
    return Promise.resolve(null);
  }

  findByEmail(): Promise<Account | null> {
    return Promise.resolve(null);
  }

  findAll(options: ListAccountsOptions): Promise<ListAccountsResult> {
    this.lastOptions = options;
    return Promise.resolve(this.result);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

function buildAccount(role: AccountRole): Account {
  return Account.register({
    email: EmailAddress.create(`${role}@example.com`),
    role,
    displayName: DisplayName.create('Some User'),
  });
}

describe('ListAccountsUseCase', () => {
  it('delegates to the repository with the query\'s pagination and role filter', async () => {
    const accounts = [buildAccount(AccountRole.Doctor)];
    const repository = new FakeAccountRepository({ accounts, total: 1 });
    const useCase = new ListAccountsUseCase(repository);

    const result = await useCase.execute(new ListAccountsQuery({ page: 1, limit: 20, role: AccountRole.Doctor }));

    assert.deepEqual(repository.lastOptions, { limit: 20, offset: 0, role: AccountRole.Doctor });
    assert.equal(result.total, 1);
    assert.equal(result.accounts, accounts);
  });

  it('omits the role filter when the query does not specify one', async () => {
    const repository = new FakeAccountRepository({ accounts: [], total: 0 });
    const useCase = new ListAccountsUseCase(repository);

    await useCase.execute(new ListAccountsQuery({ page: 1, limit: 10 }));

    assert.deepEqual(repository.lastOptions, { limit: 10, offset: 0, role: undefined });
  });

  it('converts page 3 with limit 10 into offset 20', async () => {
    const repository = new FakeAccountRepository({ accounts: [], total: 0 });
    const useCase = new ListAccountsUseCase(repository);

    await useCase.execute(new ListAccountsQuery({ page: 3, limit: 10 }));

    assert.equal(repository.lastOptions?.offset, 20);
  });
});
