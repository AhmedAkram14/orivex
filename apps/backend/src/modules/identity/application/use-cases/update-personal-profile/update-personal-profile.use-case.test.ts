import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Account } from '../../../domain/entities/account.entity.js';
import { AccountRole } from '../../../domain/enums/account-role.enum.js';
import { Gender } from '../../../domain/enums/gender.enum.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { DisplayName } from '../../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';
import { NotFoundError } from '../../../../../shared/errors/app-error.js';

import { UpdatePersonalProfileCommand } from './update-personal-profile.command.js';
import { UpdatePersonalProfileUseCase } from './update-personal-profile.use-case.js';

class FakeAccountRepository implements AccountRepository {
  public readonly saved: Account[] = [];

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

  save(account: Account): Promise<void> {
    this.saved.push(account);
    return Promise.resolve();
  }
}

function buildAccount(): Account {
  return Account.register({
    email: EmailAddress.create('patient@example.com'),
    role: AccountRole.Patient,
    displayName: DisplayName.create('Ada Lovelace'),
  });
}

describe('UpdatePersonalProfileUseCase', () => {
  it('updates dateOfBirth/gender/nationalityId/address and persists the account', async () => {
    const account = buildAccount();
    const repository = new FakeAccountRepository(account);
    const useCase = new UpdatePersonalProfileUseCase(repository);

    const result = await useCase.execute(
      new UpdatePersonalProfileCommand({
        accountId: account.getId().toString(),
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.Female,
        nationalityId: '11111111-1111-4111-8111-111111111111',
        address: '123 Tahrir Square, Cairo',
      }),
    );

    assert.ok(result.getUserProfile().getDateOfBirth());
    assert.equal(result.getUserProfile().getGender(), Gender.Female);
    assert.equal(result.getUserProfile().getNationalityId(), '11111111-1111-4111-8111-111111111111');
    assert.equal(result.getUserProfile().getAddress(), '123 Tahrir Square, Cairo');
    assert.equal(repository.saved.length, 1);
  });

  it('leaves fields unchanged when omitted from the command', async () => {
    const account = buildAccount();
    const repository = new FakeAccountRepository(account);
    const useCase = new UpdatePersonalProfileUseCase(repository);

    await useCase.execute(
      new UpdatePersonalProfileCommand({ accountId: account.getId().toString(), address: 'Only address' }),
    );

    assert.equal(account.getUserProfile().getAddress(), 'Only address');
    assert.equal(account.getUserProfile().getDateOfBirth(), undefined);
    assert.equal(account.getUserProfile().getGender(), undefined);
  });

  it('throws NotFoundError when the account does not exist', async () => {
    const repository = new FakeAccountRepository(null);
    const useCase = new UpdatePersonalProfileUseCase(repository);

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdatePersonalProfileCommand({ accountId: '22222222-2222-4222-8222-222222222222', address: 'x' }),
        ),
      NotFoundError,
    );

    assert.equal(repository.saved.length, 0);
  });
});
