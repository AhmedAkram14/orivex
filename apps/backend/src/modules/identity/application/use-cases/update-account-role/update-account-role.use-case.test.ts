import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { Account } from '../../../domain/entities/account.entity.js';
import { AccountRole } from '../../../domain/enums/account-role.enum.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { AccountClosedError } from '../../../domain/exceptions/account-closed.error.js';
import type { AccountRepository } from '../../../domain/repositories/account.repository.js';
import { DisplayName } from '../../../domain/value-objects/display-name.value-object.js';
import { EmailAddress } from '../../../domain/value-objects/email-address.value-object.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { NotFoundError } from '../../../../../shared/errors/app-error.js';

import { UpdateAccountRoleCommand } from './update-account-role.command.js';
import { UpdateAccountRoleUseCase } from './update-account-role.use-case.js';

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

class FakeDomainEventDispatcher implements DomainEventDispatcher {
  public readonly dispatched: unknown[][] = [];

  dispatch(events: unknown[]): Promise<void> {
    this.dispatched.push(events);
    return Promise.resolve();
  }

  subscribe(): void {}
}

function buildDoctorAccount(): Account {
  return Account.register({
    email: EmailAddress.create('doctor@example.com'),
    role: AccountRole.Doctor,
    displayName: DisplayName.create('Dr. Test'),
  });
}

describe('UpdateAccountRoleUseCase', () => {
  let dispatcher: FakeDomainEventDispatcher;

  beforeEach(() => {
    dispatcher = new FakeDomainEventDispatcher();
  });

  it('changes an account role, persists it, and dispatches AccountRoleChanged', async () => {
    const account = buildDoctorAccount();
    account.releaseDomainEvents();
    const repository = new FakeAccountRepository(account);
    const useCase = new UpdateAccountRoleUseCase(repository, dispatcher);

    const result = await useCase.execute(
      new UpdateAccountRoleCommand({ accountId: account.getId().toString(), newRole: AccountRole.Nurse }),
    );

    assert.equal(result.getRole(), AccountRole.Nurse);
    assert.equal(repository.saved.length, 1);
    assert.equal(dispatcher.dispatched.length, 1);
    const events = dispatcher.dispatched[0] as { eventName: string; previousRole: string; newRole: string }[];
    assert.equal(events[0].eventName, 'identity.account.role-changed');
    assert.equal(events[0].previousRole, AccountRole.Doctor);
    assert.equal(events[0].newRole, AccountRole.Nurse);
  });

  it('throws NotFoundError when the account does not exist', async () => {
    const repository = new FakeAccountRepository(null);
    const useCase = new UpdateAccountRoleUseCase(repository, dispatcher);

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateAccountRoleCommand({
            accountId: '11111111-1111-4111-8111-111111111111',
            newRole: AccountRole.Nurse,
          }),
        ),
      NotFoundError,
    );

    assert.equal(repository.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('propagates AccountClosedError for a closed account and does not persist or dispatch', async () => {
    const doctorAccount = buildDoctorAccount();
    const closedAccount = Account.reconstitute({
      id: doctorAccount.getId(),
      email: doctorAccount.getEmail(),
      role: doctorAccount.getRole(),
      status: AccountStatus.Closed,
      userProfile: doctorAccount.getUserProfile(),
      createdAt: doctorAccount.getCreatedAt(),
      updatedAt: doctorAccount.getUpdatedAt(),
    });
    const repository = new FakeAccountRepository(closedAccount);
    const useCase = new UpdateAccountRoleUseCase(repository, dispatcher);

    await assert.rejects(
      () =>
        useCase.execute(
          new UpdateAccountRoleCommand({ accountId: closedAccount.getId().toString(), newRole: AccountRole.Nurse }),
        ),
      AccountClosedError,
    );

    assert.equal(repository.saved.length, 0);
    assert.equal(dispatcher.dispatched.length, 0);
  });

  it('is idempotent when the new role equals the current role (no duplicate event)', async () => {
    const account = buildDoctorAccount();
    account.releaseDomainEvents();
    const repository = new FakeAccountRepository(account);
    const useCase = new UpdateAccountRoleUseCase(repository, dispatcher);

    await useCase.execute(
      new UpdateAccountRoleCommand({ accountId: account.getId().toString(), newRole: AccountRole.Doctor }),
    );

    assert.equal(account.getRole(), AccountRole.Doctor);
    assert.equal(repository.saved.length, 1);
    assert.deepEqual(dispatcher.dispatched[0], []);
  });
});
