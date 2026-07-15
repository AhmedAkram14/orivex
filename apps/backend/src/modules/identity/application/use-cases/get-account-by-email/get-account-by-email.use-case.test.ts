import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Account } from '../../../domain/entities/account.entity.js';
import { AccountRole } from '../../../domain/enums/account-role.enum.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import type { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';
import { DisplayName } from '../../../domain/value-objects/display-name.value-object.js';
import { EmailAddress as EmailAddressVO } from '../../../domain/value-objects/email-address.value-object.js';

import { GetAccountByEmailUseCase } from './get-account-by-email.use-case.js';

class FakeAccountRepository implements AccountRepository {
  constructor(private readonly account: Account | null) {}

  findById(): Promise<Account | null> {
    return Promise.resolve(null);
  }

  findByEmail(email: EmailAddress): Promise<Account | null> {
    if (this.account && this.account.getEmail().equals(email)) {
      return Promise.resolve(this.account);
    }
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

describe('GetAccountByEmailUseCase', () => {
  it('returns the account when an account with that email exists', async () => {
    const account = Account.register({
      email: EmailAddressVO.create('found@example.com'),
      role: AccountRole.Patient,
      displayName: DisplayName.create('Found User'),
    });
    const useCase = new GetAccountByEmailUseCase(new FakeAccountRepository(account));

    const result = await useCase.execute({ email: 'found@example.com' });

    assert.equal(result, account);
  });

  it('returns null when no account matches the email', async () => {
    const useCase = new GetAccountByEmailUseCase(new FakeAccountRepository(null));

    const result = await useCase.execute({ email: 'missing@example.com' });

    assert.equal(result, null);
  });
});
